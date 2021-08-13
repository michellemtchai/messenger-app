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
        // reorder messages from oldest to newest
        if (reverse) {
            convoJSON.messages.reverse();
        }
        convoJSON.userId = userId;

        // set a property "otherUser" so that frontend will have easier access
        if (convoJSON.user1) {
            convoJSON.otherUser = convoJSON.user1;
            delete convoJSON.user1;
        } else if (convoJSON.user2) {
            convoJSON.otherUser = convoJSON.user2;
            delete convoJSON.user2;
        }

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

        // set property for online status of the other user
        if (onlineUsers.includes(convoJSON.otherUser.id)) {
            convoJSON.otherUser.online = true;
        } else {
            convoJSON.otherUser.online = false;
        }

        // set properties for notification count and latest message preview
        convoJSON.latestMessageText = convoJSON.messages[0].text;
        return convoJSON;
    },
    updateMessagesToRead: async (convoJSON, recipientId) => {
        let readMessageIds = [];
        convoJSON.messages.forEach((message, i) => {
            if (message.senderId == recipientId) {
                convoJSON.messages[i].read = true;
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
    },
};
