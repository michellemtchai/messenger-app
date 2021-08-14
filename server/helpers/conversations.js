const { User, Conversation, Message } = require("../db/models");
const { Op } = require("sequelize");
const onlineUsers = require("../onlineUsers");

module.exports = conversation = {
    convoInclude: (userId) => {
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
    },
    formatConversation: (convoJSON, userId, reverse = true) => {
        convoJSON.userId = userId;
        conversation.reorderMessages(convoJSON, reverse);
        conversation.setOtherUser(convoJSON);
        conversation.setUnreadCount(convoJSON);
        conversation.setOnlineStatus(convoJSON);

        // set properties for notification count and latest message preview
        convoJSON.latestMessageText = convoJSON.messages[0].text;
        return convoJSON;
    },
    reorderMessages: (convoJSON, reverse) => {
        // reorder messages from oldest to newest
        if (reverse) {
            convoJSON.messages.reverse();
        }
    },
    setOtherUser: (convoJSON) => {
        // set a property "otherUser" so that frontend will have easier access
        if (convoJSON.user1) {
            convoJSON.otherUser = convoJSON.user1;
            delete convoJSON.user1;
        } else if (convoJSON.user2) {
            convoJSON.otherUser = convoJSON.user2;
            delete convoJSON.user2;
        }
    },
    setUnreadCount: (convoJSON) => {
        // set unreadCount and lastReadIndex
        convoJSON.lastReadIndex = -1;
        convoJSON.unreadCount = 0;
        convoJSON.messages.forEach((message, index) => {
            if (message.senderId === convoJSON.otherUser.id && !message.read) {
                convoJSON.unreadCount++;
            }
            if (message.senderId !== convoJSON.otherUser.id && message.read) {
                convoJSON.lastReadIndex = index;
            }
        });
    },
    setOnlineStatus: (convoJSON) => {
        // set property for online status of the other user
        if (onlineUsers.includes(convoJSON.otherUser.id)) {
            convoJSON.otherUser.online = true;
        } else {
            convoJSON.otherUser.online = false;
        }
    },
    updateMessagesToRead: async (convoJSON, recipientId) => {
        await Message.update(
            {
                read: true,
            },
            {
                where: {
                    id: {
                        [Op.in]: convoJSON.messages.map((i) => i.id),
                    },
                    senderId: recipientId,
                    read: false,
                },
            }
        );
    },
};
