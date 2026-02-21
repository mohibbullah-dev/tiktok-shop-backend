import mongoose from "mongoose";

const chatRoomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
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
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageTime: {
      type: Date,
      default: null,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["waiting", "active", "closed"],
      default: "waiting",
    },
    isMerchantOnline: {
      type: Boolean,
      default: false,
    },

    // NEW: Group this merchant belongs to
    group: {
      type: String,
      default: "general",
    },

    // NEW: Is merchant blacklisted from chat
    isBlacklisted: {
      type: Boolean,
      default: false,
    },

    // NEW: Sound notification enabled for this room
    soundEnabled: {
      type: Boolean,
      default: true,
    },

    // NEW: Intelligent allocation — was this auto assigned?
    autoAssigned: {
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
