import mongoose from "mongoose";

const chatGroupSchema = new mongoose.Schema(
  {
    // Group name (max 12 chars as per demo)
    name: {
      type: String,
      required: true,
      maxlength: 12,
      trim: true,
    },

    // Which admin created this group
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Merchants in this group
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatRoom",
      },
    ],

    // Is this the blacklist group?
    isBlacklist: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const ChatGroup = mongoose.model("ChatGroup", chatGroupSchema);
export default ChatGroup;
