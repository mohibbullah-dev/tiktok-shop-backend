import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    linkedId: {
      type: String,
      default: "", // order SN or transaction SN
    },
    amount: {
      type: Number,
      required: true, // positive = credit, negative = debit
    },
    balanceAfter: {
      type: Number,
      required: true, // balance snapshot after this transaction
    },
    type: {
      type: String,
      enum: [
        "orderPayment", // merchant paid for order (debit)
        "orderCompleted", // profit added after completion (credit)
        "recharge", // wallet top-up (credit)
        "withdrawal", // cash out (debit)
        "signInBonus", // daily sign-in reward (credit)
        "vipUpgrade", // VIP upgrade payment (debit)
        "adminAdd", // admin manually added funds (credit)
        "adminDeduct", // admin manually deducted (debit)
      ],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
