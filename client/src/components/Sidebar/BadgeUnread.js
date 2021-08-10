import React from "react";
import { Badge } from "@material-ui/core";

import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(() => ({
  badge: {
    fontWeight: "bold",
  },
}));

const BadgeUnread = (props) => {
  const classes = useStyles();
  const { count } = props;

  return count > 0 ? (
    <Badge
      color="primary"
      classes={{ badge: classes.badge }}
      badgeContent={count}
    ></Badge>
  ) : (
    ""
  );
};

export default BadgeUnread;
