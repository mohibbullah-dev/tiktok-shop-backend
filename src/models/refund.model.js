import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
  {
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    refundSn: {
      type: String,
      required: true,
      unique: true,
    },
    buyerNickname: {
      type: String,
      default: "",
    },
    receivingStatus: {
      type: String,
      default: "Not Received", // Matches demo column
    },
    serviceType: {
      type: String,
      default: "Refund Only", // Matches demo column
    },
    reasonType: {
      type: String,
      required: true, // e.g., "Out of stock", "Merchant Cancelled"
    },
    amount: {
      type: Number,
      required: true, // The totalCost to be refunded
    },
    explanation: {
      type: String,
      default: "", // Merchant's notes
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminRemark: {
      type: String,
      default: "",
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

const Refund = mongoose.model("Refund", refundSchema);
export default Refund;
