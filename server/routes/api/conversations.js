const router = require("express").Router();
const { User, Conversation, Message } = require("../../db/models");
const { Op } = require("sequelize");
const onlineUsers = require("../../onlineUsers");

// get all conversations for a user, include latest message text for preview, and all messages
// include other user model so we have info on username/profile pic (don't include current user info)
// TODO: for scalability, implement lazy loading
router.get("/", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.sendStatus(401);
    }
    const userId = req.user.id;
    const conversations = await Conversation.findAll({
      where: {
        [Op.or]: {
          user1Id: userId,
          user2Id: userId,
        },
      },
      attributes: ["id"],
      order: [[Message, "createdAt", "DESC"]],
      include: [
        { model: Message, order: ["createdAt", "DESC"] },
        {
          model: User,
          as: "user1",
          where: {
            id: {
              [Op.not]: userId,
            },
          },
          attributes: ["id", "username", "photoUrl"],
          required: false,
        },
        {
          model: User,
          as: "user2",
          where: {
            id: {
              [Op.not]: userId,
            },
          },
          attributes: ["id", "username", "photoUrl"],
          required: false,
        },
      ],
    });

    for (let i = 0; i < conversations.length; i++) {
      const convo = conversations[i];
      const convoJSON = convo.toJSON();

      // set a property "otherUser" so that frontend will have easier access
      if (convoJSON.user1) {
        convoJSON.otherUser = convoJSON.user1;
        delete convoJSON.user1;
      } else if (convoJSON.user2) {
        convoJSON.otherUser = convoJSON.user2;
        delete convoJSON.user2;
      }

      // set property unreadCount for each conversation
      let otherUserId = convoJSON.otherUser.id;
      let unreadCount = 0;
      convoJSON.lasReadMessageIndex = -1;
      convoJSON.messages.forEach((message, index) => {
        // increment unread message count
        if (message.senderId === otherUserId && !message.read) {
          unreadCount++;
        }
        // update index of message last read by other user
        if (message.senderId !== otherUserId && message.read) {
          convoJSON.lasReadMessageIndex = index;
        }
      });
      convoJSON.unreadCount = unreadCount;

      // set property for online status of the other user
      if (onlineUsers.includes(convoJSON.otherUser.id)) {
        convoJSON.otherUser.online = true;
      } else {
        convoJSON.otherUser.online = false;
      }

      // set properties for notification count and latest message preview
      convoJSON.latestMessageText = convoJSON.messages[0].text;
      convoJSON.messages.reverse();
      conversations[i] = convoJSON;
    }

    res.json(conversations);
  } catch (error) {
    next(error);
  }
});

router.post("/read", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.sendStatus(401);
    }
    const senderId = req.user.id;
    const { recipientId } = req.body;
    let conversation = await Conversation.findConversation(
      senderId,
      recipientId
    );
    let readMessageIds = [];
    conversation.messages.forEach((message) => {
      if (message.senderId !== senderId) {
        readMessageIds.push(message.id);
      }
    });
    await Message.update(
      {
        read: true,
      },
      {
        where: {
          id: {
            [Op.in]: readMessageIds,
          },
        },
      }
    );
    res.json({ unreadCount: 0 });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
