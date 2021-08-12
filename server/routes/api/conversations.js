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
      attributes: ["id", "user1LastReadIndex", "user2LastReadIndex"],
      order: [[Message, "createdAt", "DESC"]],
      include: convoHelper.convoInclude(userId),
    });

    for (let i = 0; i < conversations.length; i++) {
      const convoJSON = conversations[i].toJSON();
      conversations[i] = convoHelper.formatConversation(convoJSON);
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
      include: convoHelper.convoInclude(userId),
    });
    let convoJSON = conversation.toJSON();
    if (convoJSON.user1) {
      convoJSON.user2LastReadIndex = await convoHelper.updateLastReadIndex(
        "user2LastReadIndex", // last read index for current user
        convoId,
        convoJSON.messages,
        convoJSON.user1.id // other user id
      );
    } else if (convoJSON.user2) {
      convoJSON.user1LastReadIndex = await convoHelper.updateLastReadIndex(
        "user1LastReadIndex", // last read index for current user
        convoId,
        convoJSON.messages,
        convoJSON.user2.id // other user id
      );
    }
    convoJSON = convoHelper.formatConversation(convoJSON, false);
    res.json(convoJSON);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
