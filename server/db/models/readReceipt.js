const db = require("../db");
const Sequelize = require("sequelize");

const ReadReceipt = db.define("read-receipt", {
  lastReadIndex: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: -1,
  },
});

module.exports = ReadReceipt;
