import mongoose from "mongoose";

const merchantSchema = new mongoose.Schema(
  {
    // Link to User account
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Assigned by system
    merchantId: {
      type: String,
      unique: true,
      required: true,
    },

    // Store info
    storeName: {
      type: String,
      required: true,
    },
    storeLogo: {
      type: String,
      default: "",
    },
    storePhone: {
      type: String,
      default: "",
    },
    storeAddress: {
      type: String,
      default: "",
    },
    storeIntroduction: {
      type: String,
      default: "",
    },
    welcomeMessage: {
      type: String,
      default: "",
    },
    banners: {
      type: [String], // array of image URLs (max 3)
      default: [],
    },

    // Which merchantAdmin referred this store
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // VIP level
    vipLevel: {
      type: Number,
      default: 0, // VIP0 by default
    },

    // Financial
    balance: {
      type: Number,
      default: 0,
    },
    pendingAmount: {
      type: Number,
      default: 0, // orders in progress, not yet confirmed
    },
    totalIncome: {
      type: Number,
      default: 0,
    },
    totalProfit: {
      type: Number,
      default: 0,
    },

    // Store stats
    creditScore: {
      type: Number,
      default: 100,
    },
    starRating: {
      type: Number,
      default: 0,
    },
    positiveRatingRate: {
      type: Number,
      default: 100,
    },
    followers: {
      type: Number,
      default: 0,
    },

    // Store status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "frozen"],
      default: "pending",
    },
    isWithdrawalForbidden: {
      type: Boolean,
      default: false,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },

    // Identity verification
    realName: {
      type: String,
      default: "",
    },
    idCardNumber: {
      type: String,
      default: "",
    },
    bankCard: {
      type: String,
      default: "",
    },
    bankName: {
      type: String,
      default: "",
    },

    // Daily sign-in tracking
    lastSignIn: {
      type: Date,
      default: null,
    },
    consecutiveSignIns: {
      type: Number,
      default: 0,
    },
    monthlySignIns: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Merchant = mongoose.model("Merchant", merchantSchema);
export default Merchant;
