// models/Message.js
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Message = sequelize.define("Message", {
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  senderName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fileType: {
    type: DataTypes.STRING, // image/png, image/jpeg, dll
    allowNull: true,
  },
}, {
  tableName: "messages",
  timestamps: true,
});

export default Message;
