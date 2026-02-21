import dotenv from "dotenv";
import connectDB from "../config/db.js";
import SystemSetting from "../models/SystemSetting.model.js";

dotenv.config();
connectDB();

const settings = [
  {
    key: "signInReward",
    value: "15",
    description: "Daily sign-in reward amount in USD",
  },
  {
    key: "usdtWalletAddress",
    value: "TYourWalletAddressHere",
    description: "USDT TRC20 wallet address for recharge",
  },
  { key: "usdtNetwork", value: "TRC20", description: "USDT network type" },
  {
    key: "bankName",
    value: "Your Bank Name",
    description: "Bank name for bank recharge",
  },
  {
    key: "bankAccountNumber",
    value: "0000000000",
    description: "Bank account number",
  },
  {
    key: "bankAccountName",
    value: "Account Name",
    description: "Bank account holder name",
  },
  {
    key: "defaultCompletionDays",
    value: "3",
    description: "Default order completion days",
  },
  {
    key: "minWithdrawal",
    value: "50",
    description: "Minimum withdrawal amount",
  },
  {
    key: "maxWithdrawal",
    value: "50000",
    description: "Maximum withdrawal amount",
  },
  {
    key: "customerServiceHours",
    value: "10:00AM-10:00PM",
    description: "Customer service working hours",
  },
];

const seed = async () => {
  try {
    await SystemSetting.deleteMany({});
    await SystemSetting.insertMany(settings);
    console.log("System settings seeded!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
