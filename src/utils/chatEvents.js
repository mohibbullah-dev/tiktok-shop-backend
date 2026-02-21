import ChatMessage from "../models/chatMessage.model.js";
import ChatRoom from "../models/ChatRoom.model.js";

export const chatEvents = (io) => {
  // Store online users: userId → socketId
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // ─────────────────────────────────────────
    // Intelligent allocation — auto assign
    // agent to waiting rooms when they connect
    // ─────────────────────────────────────────
    socket.on("agent_online", async ({ userId, role }) => {
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;
      socket.userRole = role;

      // Find the user's preference
      const user = await User.findById(userId);

      // If intelligent allocation is ON, auto assign waiting rooms
      if (user && user.intelligentAllocation) {
        const waitingRooms = await ChatRoom.find({
          status: "waiting",
          assignedAgent: null,
          isBlacklisted: false,
        });

        for (const room of waitingRooms) {
          room.assignedAgent = userId;
          room.status = "active";
          room.autoAssigned = true;
          await room.save();

          // Notify the merchant their chat was picked up
          const merchantSocketId = onlineUsers.get(
            room.merchantUser.toString(),
          );
          if (merchantSocketId) {
            io.to(merchantSocketId).emit("agent_assigned", {
              roomId: room.roomId,
              agentName: user.username,
            });
          }
        }

        // Tell the agent how many rooms were assigned
        socket.emit("auto_assigned", {
          count: waitingRooms.length,
        });
      }

      // Notify others this agent is online
      socket.broadcast.emit("agent_online", { userId, role });
    });

    // ─────────────────────────────────────────
    // Sound notification toggle
    // ─────────────────────────────────────────
    socket.on("toggle_sound", async ({ enabled }) => {
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, {
          soundEnabled: enabled,
        });
      }
    });

    // ─────────────────────────────────────────
    // Intelligent allocation toggle
    // ─────────────────────────────────────────
    socket.on("toggle_allocation", async ({ enabled }) => {
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, {
          intelligentAllocation: enabled,
        });
      }
    });

    // ─────────────────────────────────────────
    // User comes online
    // Client emits: { userId, role }
    // ─────────────────────────────────────────
    socket.on("user_online", async ({ userId, role }) => {
      // Map userId to socketId
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;
      socket.userRole = role;

      console.log(`User online: ${userId} (${role})`);

      // If merchant, update their room
      if (role === "merchant") {
        const roomId = `room_${userId}`;
        await ChatRoom.findOneAndUpdate({ roomId }, { isMerchantOnline: true });
        // Notify agents merchant is online
        socket.broadcast.emit("user_online", { userId, role });
      }
    });

    // ─────────────────────────────────────────
    // Join a chat room
    // Client emits: { roomId }
    // ─────────────────────────────────────────
    socket.on("join_room", ({ roomId }) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room: ${roomId}`);
    });

    // ─────────────────────────────────────────
    // Send a message
    // Client emits: { roomId, message, messageType, imageUrl, senderName, senderAvatar }
    // ─────────────────────────────────────────
    socket.on("send_message", async (data) => {
      const {
        roomId,
        message,
        messageType = "text",
        imageUrl = "",
        senderName,
        senderAvatar,
      } = data;

      try {
        // Save message to database
        const newMessage = await ChatMessage.create({
          roomId,
          sender: socket.userId,
          senderRole: socket.userRole,
          senderName,
          senderAvatar,
          message,
          messageType,
          imageUrl,
        });

        // Update room's last message
        await ChatRoom.findOneAndUpdate(
          { roomId },
          {
            lastMessage: messageType === "image" ? "[Image]" : message,
            lastMessageTime: new Date(),
            $inc: { unreadCount: 1 },
          },
        );

        // Broadcast message to everyone in the room
        io.to(roomId).emit("new_message", {
          _id: newMessage._id,
          roomId,
          sender: socket.userId,
          senderRole: socket.userRole,
          senderName,
          senderAvatar,
          message,
          messageType,
          imageUrl,
          createdAt: newMessage.createdAt,
        });
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("message_error", { error: "Failed to send message" });
      }
    });

    // ─────────────────────────────────────────
    // Typing indicator
    // Client emits: { roomId, isTyping }
    // ─────────────────────────────────────────
    socket.on("typing", ({ roomId, isTyping }) => {
      // Broadcast to everyone in room EXCEPT sender
      socket.to(roomId).emit("typing_indicator", {
        userId: socket.userId,
        isTyping,
      });
    });

    // ─────────────────────────────────────────
    // Mark messages as read
    // Client emits: { roomId }
    // ─────────────────────────────────────────
    socket.on("mark_read", async ({ roomId }) => {
      await ChatMessage.updateMany(
        {
          roomId,
          sender: { $ne: socket.userId },
          isRead: false,
        },
        { isRead: true, readAt: new Date() },
      );

      await ChatRoom.findOneAndUpdate({ roomId }, { unreadCount: 0 });

      // Notify sender their messages were read
      socket.to(roomId).emit("messages_read", { roomId });
    });

    // ─────────────────────────────────────────
    // User disconnects
    // ─────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.id}`);

      if (socket.userId) {
        onlineUsers.delete(socket.userId);

        // If merchant, mark offline
        if (socket.userRole === "merchant") {
          const roomId = `room_${socket.userId}`;
          await ChatRoom.findOneAndUpdate(
            { roomId },
            { isMerchantOnline: false },
          );
          socket.broadcast.emit("user_offline", { userId: socket.userId });
        }
      }
    });
  });
};
