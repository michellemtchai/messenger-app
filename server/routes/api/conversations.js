const router = require("express").Router();
const { Conversation, Message } = require("../../db/models");
const { Op } = require("sequelize");
const convoHelper = require("../../helpers/conversations");

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
      include: convoHelper.convoInclude(userId),
    });

    for (let i = 0; i < conversations.length; i++) {
      const convoJSON = conversations[i].toJSON();
      conversations[i] = convoHelper.formatConversation(convoJSON, userId);
    }

    res.json(conversations);
  } catch (error) {
    next(error);
  }
});

router.get("/read/:recipientId", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.sendStatus(401);
    }
    const userId = req.user.id;
    const { recipientId } = req.params;
    let conversation = await Conversation.findOne({
      where: {
        user1Id: {
          [Op.or]: [userId, recipientId],
        },
        user2Id: {
          [Op.or]: [userId, recipientId],
        },
      },
      order: [[Message, "createdAt", "ASC"]],
      include: convoHelper.convoInclude(userId),
    });
    if (conversation) {
      let convoJSON = conversation.toJSON();
      await convoHelper.updateMessagesToRead(convoJSON, recipientId);
      convoJSON = convoHelper.formatConversation(convoJSON, userId, false);
      res.json(convoJSON);
    } else {
      throw Error("Conversation not found");
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
