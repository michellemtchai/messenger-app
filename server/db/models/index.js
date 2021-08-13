const Conversation = require("./conversation");
const User = require("./user");
const Message = require("./message");
const ReadReceipt = require("./readReceipt");

// associations

User.belongsToMany(Conversation, { through: ReadReceipt });
Conversation.belongsToMany(User, { through: ReadReceipt });
Message.belongsTo(Conversation);
Conversation.hasMany(Message);

module.exports = {
    User,
    Conversation,
    Message,
    ReadReceipt,
};
