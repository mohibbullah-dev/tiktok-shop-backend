import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    signInDate: {
      type: String, // stored as "YYYY-MM-DD" for easy daily lookup
      required: true,
    },
    reward: {
      type: Number,
      default: 15, // $15 per sign-in as seen in demo
    },
    status: {
      type: String,
      default: "signed",
    },
  },
  {
    timestamps: true,
  },
);

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
