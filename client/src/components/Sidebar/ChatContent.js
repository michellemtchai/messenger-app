import React from "react";
import { Box, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    justifyContent: "space-between",
    marginLeft: 20,
    flexGrow: 0.8,
  },
  username: {
    fontWeight: "bold",
    letterSpacing: -0.2,
  },
  previewText: {
    fontSize: 12,
    color: "#9CADC8",
    letterSpacing: -0.17,
  },
  bold: {
    fontWeight: "bold",
    color: "#000000",
  },
}));

const ChatContent = (props) => {
  const classes = useStyles();

  const { conversation, count } = props;
  const { latestMessageText, otherUser } = conversation;
  const previewTextClass =
    count > 0 ? `${classes.previewText} ${classes.bold}` : classes.previewText;
  return (
    <Box className={classes.root}>
      <Box>
        <Typography className={classes.username}>
          {otherUser.username}
        </Typography>
        <Typography className={previewTextClass}>
          {latestMessageText}
        </Typography>
      </Box>
    </Box>
  );
};

export default ChatContent;
