import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./src/config/db.js";
import { startCronJobs } from "./src/utils/cronJobs.js";
// route imports
import authRouter from "./src/routes/auth.route.js";
import merchantRoutes from "./src/routes/merchant.route.js";
import rechargeRoutes from "./src/routes/recharge.route.js";
import withdrawalRoutes from "./src/routes/withdrawal.route.js";
import orderRoutes from "./src/routes/order.route.js";
import vipRoutes from "./src/routes/vip.route.js";
import productRoutes from "./src/routes/product.route.js";
import transactionRoutes from "./src/routes/transaction.route.js";
import attendanceRoutes from "./src/routes/attendance.route.js";
import noticeRoutes from "./src/routes/notice.route.js";

// Load environment variables
dotenv.config();

// Connect to database
connectDB();
startCronJobs();
// Create express app
const app = express();

// Create HTTP server (needed for socket.io)
const httpServer = createServer(app);

// Setup Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes
app.use("/api/auth", authRouter);
app.use("/api/merchants", merchantRoutes);
app.use("/api/recharge", rechargeRoutes);
app.use("/api/withdrawal", withdrawalRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/vip", vipRoutes);
app.use("/api/products", productRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notices", noticeRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({ message: "TikTok Shop API is running..." });
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
