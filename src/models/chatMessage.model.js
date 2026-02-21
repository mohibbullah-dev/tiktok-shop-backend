import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    // Which conversation this message belongs to
    roomId: {
      type: String,
      required: true,
      index: true,
    },

    // Who sent it
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    senderRole: {
      type: String,
      enum: ["merchant", "superAdmin", "merchantAdmin", "dispatchAdmin"],
      required: true,
    },

    senderName: {
      type: String,
      default: "",
    },

    senderAvatar: {
      type: String,
      default: "",
    },

    // Message content
    message: {
      type: String,
      default: "",
    },

    // Message type
    messageType: {
      type: String,
      enum: ["text", "image", "system"],
      default: "text",
    },

    // Image URL if messageType is image
    imageUrl: {
      type: String,
      default: "",
    },

    // Read status
    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
export default ChatMessage;
