import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
  {
    extractSn: {
      type: String,
      unique: true,
      required: true,
    },
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    extractPrice: {
      type: Number,
      required: true,
    },
    extractType: {
      type: String,
      enum: ["bankCard", "blockchain"],
      required: true,
    },
    currencyType: {
      type: String,
      default: "USD",
    },

    // Bank card details
    accountName: {
      type: String,
      default: "",
    },
    bankCardNumber: {
      type: String,
      default: "",
    },
    bankName: {
      type: String,
      default: "",
    },

    // Blockchain details
    network: {
      type: String,
      default: "", // e.g. "USDT-TRC20"
    },
    walletAddress: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["underReview", "withdrawn", "rejected"],
      default: "underReview",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);
export default Withdrawal;
