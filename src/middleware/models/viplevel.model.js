import mongoose from "mongoose";

const vipLevelSchema = new mongoose.Schema(
  {
    levelId: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true, // "VIP0", "VIP1", etc.
    },
    nameEn: {
      type: String,
      required: true,
    },
    level: {
      type: Number,
      required: true, // 0, 1, 2, 3, 4, 5, 6
    },
    icon: {
      type: String,
      default: "", // image URL
    },
    // Working capital required to upgrade
    price: {
      type: Number,
      required: true, // 0, 1000, 2000, 4000, 8000, 16000, 32000
    },
    // Profit rate for this level
    rate: {
      type: Number,
      required: true, // 0.15, 0.20, 0.25, 0.27, 0.33, 0.38, 0.43
    },
    // Required visits/traffic
    requiredVisits: {
      type: Number,
      default: 0,
    },
    status: {
      type: Number,
      default: 1, // 1 = active, 0 = inactive
    },
  },
  {
    timestamps: true,
  },
);

const VipLevel = mongoose.model("VipLevel", vipLevelSchema);
export default VipLevel;
