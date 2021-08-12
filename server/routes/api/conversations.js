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
      attributes: ["id", "user1LastReadIndex", "user2LastReadIndex"],
      order: [[Message, "createdAt", "DESC"]],
      include: convoInclude(userId),
    });

    for (let i = 0; i < conversations.length; i++) {
      conversations[i] = formatConversation(conversations[i]);
    }

    res.json(conversations);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/read", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.sendStatus(401);
    }
    const convoId = req.params.id;
    const userId = req.user.id;
    const { otherUserId } = req.body;
    let conversation = await Conversation.findOne({
      where: {
        id: convoId,
      },
      include: convoInclude(userId),
    });
    conversation = formatConversation(conversation);
    if (conversation.hasOwnProperty("user1")) {
      conversation.lastReadIndex = updateLastReadIndex(
        "user1LastReadIndex", // last read index for current user
        convoId,
        conversation.messages,
        otherUserId
      );
    } else if (conversation.hasOwnProperty("user2")) {
      conversation.lastReadIndex = updateLastReadIndex(
        "user2LastReadIndex", // last read index for current user
        convoId,
        conversation.messages,
        otherUserId
      );
    }
    conversation.unreadCount = 0;
    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

const convoInclude = (userId) => {
  return [
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
  ];
};

const formatConversation = (conversation) => {
  const convoJSON = conversation.toJSON();

  // set a property "otherUser" so that frontend will have easier access
  if (convoJSON.user1) {
    convoJSON.otherUser = convoJSON.user1;
    delete convoJSON.user1;

    // add property showReadReceipt of the other user for each conversation
    convoJSON.messages = setShowReadReceipts(
      convoJSON.messages,
      convoJSON.user1LastReadIndex
    );

    // set property unreadCount of current user for each conversation
    const otherUserId = convoJSON.otherUser.id;
    convoJSON.unreadCount = unreadCount(
      convoJSON.messages,
      otherUserId,
      convoJSON.user2LastReadIndex
    );
  } else if (convoJSON.user2) {
    convoJSON.otherUser = convoJSON.user2;
    delete convoJSON.user2;

    // set property lastReadIndex of the other user for each conversation
    convoJSON.messages = setShowReadReceipts(
      convoJSON.messages,
      convoJSON.user2LastReadIndex
    );

    // set property unreadCount of current user for each conversation
    const otherUserId = convoJSON.otherUser.id;
    convoJSON.unreadCount = unreadCount(
      convoJSON.messages,
      otherUserId,
      convoJSON.user1LastReadIndex
    );
  }

  // set property for online status of the other user
  if (onlineUsers.includes(convoJSON.otherUser.id)) {
    convoJSON.otherUser.online = true;
  } else {
    convoJSON.otherUser.online = false;
  }

  // set properties for notification count and latest message preview
  convoJSON.latestMessageText = convoJSON.messages[0].text;
  convoJSON.messages.reverse();
  return convoJSON;
};

const setShowReadReceipts = (messages, lastIndex) => {
  return messages.map((message, index) => {
    if (index === lastIndex) {
      message.showReadReceipt = true;
    } else {
      message.showReadReceipt = false;
    }
    return message;
  });
};

const unreadCount = (messages, otherUserId, lastIndex) => {
  let unreadCount = 0;
  if (lastIndex === -1) {
    messages.forEach((message) => {
      if (message.senderId !== otherUserId) {
        unreadCount++;
      }
    });
  } else {
    if (messages.length - 1 > lastIndex) {
      for (let i = messages.length - 1; i > lastIndex; i--) {
        if (messages[i].senderId !== otherUserId) {
          unreadCount++;
        }
      }
    }
  }
  return unreadCount;
};

const updateLastReadIndex = async (
  lastIndexKey,
  convoId,
  messages,
  otherUserId
) => {
  let lastIndex = -1;
  let index = messages.length - 1;
  while (index > 0) {
    if (messages[index].senderId === otherUserId) {
      lastIndex = index;
      break;
    }
    index--;
  }
  await Conversation.update(
    {
      [lastIndexKey]: lastIndex,
    },
    {
      where: {
        id: convoId,
      },
    }
  );
  return lastIndex;
};

module.exports = router;
