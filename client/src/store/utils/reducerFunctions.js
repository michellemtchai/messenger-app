export const addMessageToStore = (state, payload) => {
  const { message, sender } = payload;
  // if sender isn't null, that means the message needs to be put in a brand new convo
  if (sender !== null) {
    const newConvo = {
      id: message.conversationId,
      otherUser: sender,
      messages: [message],
      unreadCount: 1,
    };
    newConvo.latestMessageText = message.text;
    return [newConvo, ...state];
  }

  return state.map((convo) => {
    if (convo.id === message.conversationId) {
      const convoCopy = { ...convo };
      if (message.senderId === convoCopy.otherUser.id) {
        convoCopy.unreadCount++;
      }
      convoCopy.messages.push(message);
      convoCopy.latestMessageText = message.text;
      return convoCopy;
    } else {
      return convo;
    }
  });
};

export const addOnlineUserToStore = (state, id) => {
  return state.map((convo) => {
    if (convo.otherUser.id === id) {
      const convoCopy = { ...convo };
      convoCopy.otherUser.online = true;
      return convoCopy;
    } else {
      return convo;
    }
  });
};

export const removeOfflineUserFromStore = (state, id) => {
  return state.map((convo) => {
    if (convo.otherUser.id === id) {
      const convoCopy = { ...convo };
      convoCopy.otherUser.online = false;
      return convoCopy;
    } else {
      return convo;
    }
  });
};

export const addSearchedUsersToStore = (state, users) => {
  const currentUsers = {};

  // make table of current users so we can lookup faster
  state.forEach((convo) => {
    currentUsers[convo.otherUser.id] = true;
  });

  const newState = [...state];
  users.forEach((user) => {
    // only create a fake convo if we don't already have a convo with this user
    if (!currentUsers[user.id]) {
      let fakeConvo = { otherUser: user, messages: [] };
      newState.push(fakeConvo);
    }
  });

  return newState;
};

export const addNewConvoToStore = (state, recipientId, message) => {
  return state.map((convo) => {
    if (convo.otherUser.id === recipientId) {
      const convoCopy = { ...convo };
      convoCopy.id = message.conversationId;
      convoCopy.messages.push(message);
      convoCopy.latestMessageText = message.text;
      return convoCopy;
    } else {
      return convo;
    }
  });
};

export const addUpdatedConvoToStore = (state, updatedConvo, compute) => {
  return state.map((convo) => {
    if (convo.id === updatedConvo.id) {
      const convoCopy = { ...convo };
      convoCopy.messages = updatedConvo.messages;
      if (compute) {
        convoCopy.unreadCount = 0;
        convoCopy.lastReadIndex = -1;
        convoCopy.messages.forEach((message, index) => {
          if (message.senderId === updatedConvo.recipientId && !message.read) {
            convoCopy.unreadCount++;
          }
          if (message.senderId !== updatedConvo.recipientId && message.read) {
            convoCopy.lastReadIndex = index;
          }
        });
      } else {
        convoCopy.unreadCount = updatedConvo.unreadCount;
        convoCopy.lastReadIndex = updatedConvo.lastReadIndex;
      }
      return convoCopy;
    } else {
      return convo;
    }
  });
};
