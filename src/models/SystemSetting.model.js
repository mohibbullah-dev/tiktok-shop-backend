import mongoose from "mongoose";

const systemSettingSchema = new mongoose.Schema(
  {
    // Deposit Addresses
    usdtTrc20Address: { type: String, default: "" },
    usdtErc20Address: { type: String, default: "" },

    // Financial Rules
    minWithdrawalAmount: { type: Number, default: 10 },
    withdrawalFeePercent: { type: Number, default: 5 },
    minRechargeAmount: { type: Number, default: 10 },

    // Platform Info
    appDownloadLink: { type: String, default: "" },
    customerServiceLink: { type: String, default: "" }, // Fallback external link
    announcementMarquee: { type: String, default: "Welcome to our platform!" },
    workingHours: { type: String, default: "09:00 - 22:00" },
  },
  { timestamps: true },
);

const SystemSetting = mongoose.model("SystemSetting", systemSettingSchema);
export default SystemSetting;
