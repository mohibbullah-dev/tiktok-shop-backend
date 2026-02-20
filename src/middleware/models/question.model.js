import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true, // e.g. "Transportation Rules"
    },
    content: {
      type: String,
      required: true, // HTML or plain text content
    },
    category: {
      type: String,
      default: "",
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const Question = mongoose.model("Question", questionSchema);
export default Question;
