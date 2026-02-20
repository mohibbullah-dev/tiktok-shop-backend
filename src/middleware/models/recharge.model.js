import mongoose from "mongoose";

const rechargeSchema = new mongoose.Schema(
  {
    rechargeId: {
      type: String,
      unique: true,
      required: true,
    },
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    orderId: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
    },
    rechargeType: {
      type: String,
      enum: ["USDT", "bank"],
      default: "USDT",
    },
    currencyType: {
      type: String,
      default: "USD",
    },
    voucher: {
      type: String,
      default: "", // uploaded screenshot image URL
    },
    status: {
      type: Number,
      enum: [0, 1],
      default: 0, // 0 = pending review, 1 = approved
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const Recharge = mongoose.model("Recharge", rechargeSchema);
export default Recharge;
