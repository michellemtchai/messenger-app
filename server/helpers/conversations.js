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
    formatConversation: (convoJSON, reverse = true) => {
        // reorder messages from oldest to newest
        if (reverse) {
            convoJSON.messages.reverse();
        }

        // set a property "otherUser" so that frontend will have easier access
        if (convoJSON.user1) {
            convoJSON.otherUser = convoJSON.user1;
            delete convoJSON.user1;
            conversation.setReadAttributes(
                convoJSON,
                convoJSON.user1LastReadIndex,
                convoJSON.user2LastReadIndex
            );
        } else if (convoJSON.user2) {
            convoJSON.otherUser = convoJSON.user2;
            delete convoJSON.user2;
            conversation.setReadAttributes(
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
    },
    setReadAttributes: (
        convoJSON,
        otherUserLastReadIndex,
        currentUserLastReadIndex
    ) => {
        // add property showReadReceipt to each message
        convoJSON.messages = conversation.setShowReadReceipts(
            convoJSON.messages,
            otherUserLastReadIndex
        );

        // set property unreadCount of current user for each conversation
        const otherUserId = convoJSON.otherUser.id;
        convoJSON.unreadCount = conversation.unreadCount(
            convoJSON.messages,
            otherUserId,
            currentUserLastReadIndex
        );
    },
    setShowReadReceipts: (messages, lastIndex) => {
        return messages.map((message, index) => {
            if (index === lastIndex) {
                message.showReadReceipt = true;
            } else {
                message.showReadReceipt = false;
            }
            return message;
        });
    },
    unreadCount: (messages, otherUserId, lastIndex) => {
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
    },
    updateLastReadIndex: async (convoJSON, lastIndexKey, otherUserId) => {
        let lastIndex = convoJSON.messages.length - 1;
        while (lastIndex > -1) {
            if (
                lastIndex === -1 ||
                convoJSON.messages[lastIndex].senderId === otherUserId
            ) {
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
                    id: convoJSON.id,
                },
            }
        );
        convoJSON[lastIndexKey] = lastIndex;
    },
};
