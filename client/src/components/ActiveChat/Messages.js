import React from "react";
import { Box } from "@material-ui/core";
import { SenderBubble, OtherUserBubble, ReadReceipt } from "../ActiveChat";
import moment from "moment";

const Messages = (props) => {
  const { messages, otherUser, userId, lastReadIndex } = props;
  return (
    <Box>
      {messages.map((message, index) => {
        const time = moment(message.createdAt).format("h:mm");

        return (
          <React.Fragment key={message.id}>
            {message.senderId === userId ? (
              <SenderBubble text={message.text} time={time} />
            ) : (
              <OtherUserBubble
                text={message.text}
                time={time}
                otherUser={otherUser}
              />
            )}
            <ReadReceipt
              show={lastReadIndex === index}
              username={otherUser.username}
              photoUrl={otherUser.photoUrl}
            />
          </React.Fragment>
        );
      })}
    </Box>
  );
};

export default Messages;
