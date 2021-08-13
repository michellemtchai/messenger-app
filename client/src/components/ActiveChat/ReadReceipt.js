import React from "react";
import { Box, Avatar } from "@material-ui/core";

import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(() => ({
  root: {
    display: "flex",
    justifyContent: "flex-end",
    padding: "10px 0",
  },
  profilePic: {
    height: 25,
    width: 25,
    borderRadius: "50%",
    border: "2px solid white",
    backgroundColor: "#D0DAE9",
  },
}));

const ReadReceipt = (props) => {
  const classes = useStyles();
  const { show, photoUrl, username } = props;

  return show && (
    <Box className={classes.root}>
      <Avatar
        alt={`Read by ${username}`}
        src={photoUrl}
        className={classes.profilePic}
      />
    </Box>
  )
};

export default ReadReceipt;
