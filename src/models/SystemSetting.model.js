import mongoose from "mongoose";

const systemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
    description: { type: String, default: "" },
  },
  { timestamps: true },
);

const SystemSetting = mongoose.model("SystemSetting", systemSettingSchema);
export default SystemSetting;
