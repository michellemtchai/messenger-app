import React from "react";
import { Box } from "@material-ui/core";
import { SenderBubble, OtherUserBubble, ReadReceipt } from "../ActiveChat";
import moment from "moment";

const Messages = (props) => {
  const { messages, otherUser, userId, readIndex } = props;
  return (
    <Box>
      {messages.map((message, index) => {
        const time = moment(message.createdAt).format("h:mm");

        return (
          <>
            {message.senderId === userId ? (
              <>
                <SenderBubble
                  key={message.id}
                  text={message.text}
                  time={time}
                />
              </>
            ) : (
              <OtherUserBubble
                key={message.id}
                text={message.text}
                time={time}
                otherUser={otherUser}
              />
            )}
            <ReadReceipt
              show={readIndex === index}
              username={otherUser.username}
              photoUrl={otherUser.photoUrl}
            />
          </>
        );
      })}
    </Box>
  );
};

export default Messages;
