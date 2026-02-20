import mongoose from "mongoose";

const trafficTaskSchema = new mongoose.Schema(
  {
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    startExecutionTime: {
      type: Date,
      default: null,
    },
    executionDuration: {
      type: Number,
      default: 43200, // in minutes, as seen in demo
    },
    traffic: {
      type: Number,
      default: 0,
    },
    completedTraffic: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["inProgress", "executionCompleted", "ended"],
      default: "inProgress",
    },
    taskInformation: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

const TrafficTask = mongoose.model("TrafficTask", trafficTaskSchema);
export default TrafficTask;
