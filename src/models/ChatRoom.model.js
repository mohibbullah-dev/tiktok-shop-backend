import mongoose from "mongoose";

const chatRoomSchema = new mongoose.Schema(
  {
    // Unique room identifier
    roomId: {
      type: String,
      required: true,
      unique: true,
    },

    // The merchant in this conversation
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },

    merchantUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The support agent handling this chat
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Last message preview
    lastMessage: {
      type: String,
      default: "",
    },

    lastMessageTime: {
      type: Date,
      default: null,
    },

    // Unread count for agent side
    unreadCount: {
      type: Number,
      default: 0,
    },

    // Room status
    status: {
      type: String,
      enum: ["waiting", "active", "closed"],
      default: "waiting",
      // waiting = no agent assigned yet
      // active = agent is chatting
      // closed = conversation ended
    },

    // Is merchant currently online
    isMerchantOnline: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);
export default ChatRoom;
