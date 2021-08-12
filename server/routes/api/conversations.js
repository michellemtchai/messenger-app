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
      conversations[i] = formatConversation(conversations[i].toJSON());
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
    let conversation = await Conversation.findOne({
      where: {
        id: convoId,
      },
      include: convoInclude(userId),
    });
    let convoJSON = conversation.toJSON();
    if (convoJSON.user1) {
      // not null when other user
      convoJSON.user2LastReadIndex = await updateLastReadIndex(
        "user2LastReadIndex", // last read index for current user
        convoId,
        convoJSON.messages,
        convoJSON.user1.id // other user id
      );
    } else if (convoJSON.user2) {
      // not null when other user
      convoJSON.user1LastReadIndex = await updateLastReadIndex(
        "user1LastReadIndex", // last read index for current user
        convoId,
        convoJSON.messages,
        convoJSON.user2.id // other user id
      );
    }
    convoJSON = formatConversation(convoJSON, false);
    res.json(convoJSON);
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

const formatConversation = (convoJSON, reverse = true) => {
  // order messages from oldest to newest
  if (reverse) {
    convoJSON.messages.reverse();
  }

  // set a property "otherUser" so that frontend will have easier access
  if (convoJSON.user1) {
    convoJSON.otherUser = convoJSON.user1;
    delete convoJSON.user1;
    setReadAttributes(
      convoJSON,
      convoJSON.user1LastReadIndex,
      convoJSON.user2LastReadIndex
    );
  } else if (convoJSON.user2) {
    convoJSON.otherUser = convoJSON.user2;
    delete convoJSON.user2;
    setReadAttributes(
      convoJSON,
      convoJSON.user2LastReadIndex,
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
  return convoJSON;
};

const setReadAttributes = (
  convoJSON,
  otherUserLastReadIndex,
  currentUserLastReadIndex
) => {
  // add property showReadReceipt to each message
  convoJSON.messages = setShowReadReceipts(
    convoJSON.messages,
    otherUserLastReadIndex
  );

  // set property unreadCount of current user for each conversation
  const otherUserId = convoJSON.otherUser.id;
  convoJSON.unreadCount = unreadCount(
    convoJSON.messages,
    otherUserId,
    currentUserLastReadIndex
  );
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
      if (message.senderId === otherUserId) {
        unreadCount++;
      }
    });
  } else {
    if (messages.length - 1 > lastIndex) {
      for (let i = messages.length - 1; i > lastIndex; i--) {
        if (messages[i].senderId === otherUserId) {
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
  let lastIndex = messages.length - 1;
  while (lastIndex > 0) {
    if (messages[lastIndex].senderId === otherUserId) {
      break;
    }
    lastIndex--;
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
