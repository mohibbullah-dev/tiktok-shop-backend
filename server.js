import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./src/config/db.js";
import authRouter from "./src/routes/auth.route.js";
import merchantRoutes from "./src/routes/merchant.route.js";

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

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
