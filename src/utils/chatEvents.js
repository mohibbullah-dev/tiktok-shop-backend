// import ChatMessage from "../models/chatMessage.model.js";
// import ChatRoom from "../models/ChatRoom.model.js";
// import User from "../models/user.model.js";

// export const chatEvents = (io) => {
//   // Store online users: userId → socketId
//   const onlineUsers = new Map();

//   io.on("connection", (socket) => {
//     console.log(`Socket connected: ${socket.id}`);

//     // ─────────────────────────────────────────
//     // Intelligent allocation — auto assign
//     // agent to waiting rooms when they connect
//     // ─────────────────────────────────────────
//     socket.on("agent_online", async ({ userId, role }) => {
//       onlineUsers.set(userId, socket.id);
//       socket.userId = userId;
//       socket.userRole = role;

//       // Find the user's preference
//       const user = await User.findById(userId);

//       // If intelligent allocation is ON, auto assign waiting rooms
//       if (user && user.intelligentAllocation) {
//         const waitingRooms = await ChatRoom.find({
//           status: "waiting",
//           assignedAgent: null,
//           isBlacklisted: false,
//         });

//         for (const room of waitingRooms) {
//           room.assignedAgent = userId;
//           room.status = "active";
//           room.autoAssigned = true;
//           await room.save();

//           // Notify the merchant their chat was picked up
//           const merchantSocketId = onlineUsers.get(
//             room.merchantUser.toString(),
//           );
//           if (merchantSocketId) {
//             io.to(merchantSocketId).emit("agent_assigned", {
//               roomId: room.roomId,
//               agentName: user.username,
//             });
//           }
//         }

//         // Tell the agent how many rooms were assigned
//         socket.emit("auto_assigned", {
//           count: waitingRooms.length,
//         });
//       }

//       // Notify others this agent is online
//       socket.broadcast.emit("agent_online", { userId, role });
//     });

//     // ─────────────────────────────────────────
//     // Sound notification toggle
//     // ─────────────────────────────────────────
//     socket.on("toggle_sound", async ({ enabled }) => {
//       if (socket.userId) {
//         await User.findByIdAndUpdate(socket.userId, {
//           soundEnabled: enabled,
//         });
//       }
//     });

//     // ─────────────────────────────────────────
//     // Intelligent allocation toggle
//     // ─────────────────────────────────────────
//     socket.on("toggle_allocation", async ({ enabled }) => {
//       if (socket.userId) {
//         await User.findByIdAndUpdate(socket.userId, {
//           intelligentAllocation: enabled,
//         });
//       }
//     });

//     // ─────────────────────────────────────────
//     // User comes online
//     // Client emits: { userId, role }
//     // ─────────────────────────────────────────
//     socket.on("user_online", async ({ userId, role }) => {
//       // Map userId to socketId
//       onlineUsers.set(userId, socket.id);
//       socket.userId = userId;
//       socket.userRole = role;

//       console.log(`User online: ${userId} (${role})`);

//       // If merchant, update their room
//       if (role === "merchant") {
//         const roomId = `room_${userId}`;
//         await ChatRoom.findOneAndUpdate({ roomId }, { isMerchantOnline: true });
//         // Notify agents merchant is online
//         socket.broadcast.emit("user_online", { userId, role });
//       }
//     });

//     // ─────────────────────────────────────────
//     // Join a chat room
//     // Client emits: { roomId }
//     // ─────────────────────────────────────────
//     socket.on("join_room", ({ roomId }) => {
//       socket.join(roomId);
//       console.log(`Socket ${socket.id} joined room: ${roomId}`);
//     });

//     // ─────────────────────────────────────────
//     // Send a message
//     // Client emits: { roomId, message, messageType, imageUrl, senderName, senderAvatar }
//     // ─────────────────────────────────────────
//     socket.on("send_message", async (data) => {
//       const {
//         roomId,
//         message,
//         messageType = "text",
//         imageUrl = "",
//         senderName,
//         senderAvatar,
//       } = data;

//       try {
//         // Save message to database
//         const newMessage = await ChatMessage.create({
//           roomId,
//           sender: socket.userId,
//           senderRole: socket.userRole,
//           senderName,
//           senderAvatar,
//           message,
//           messageType,
//           imageUrl,
//         });

//         // Update room's last message
//         await ChatRoom.findOneAndUpdate(
//           { roomId },
//           {
//             lastMessage: messageType === "image" ? "[Image]" : message,
//             lastMessageTime: new Date(),
//             $inc: { unreadCount: 1 },
//           },
//         );

//         // Broadcast message to everyone in the room
//         io.to(roomId).emit("new_message", {
//           _id: newMessage._id,
//           roomId,
//           sender: socket.userId,
//           senderRole: socket.userRole,
//           senderName,
//           senderAvatar,
//           message,
//           messageType,
//           imageUrl,
//           createdAt: newMessage.createdAt,
//         });
//       } catch (error) {
//         console.error("Send message error:", error);
//         socket.emit("message_error", { error: "Failed to send message" });
//       }
//     });

//     // ─────────────────────────────────────────
//     // Typing indicator
//     // Client emits: { roomId, isTyping }
//     // ─────────────────────────────────────────
//     socket.on("typing", ({ roomId, isTyping }) => {
//       // Broadcast to everyone in room EXCEPT sender
//       socket.to(roomId).emit("typing_indicator", {
//         userId: socket.userId,
//         isTyping,
//       });
//     });

//     // ─────────────────────────────────────────
//     // Mark messages as read
//     // Client emits: { roomId }
//     // ─────────────────────────────────────────
//     socket.on("mark_read", async ({ roomId }) => {
//       await ChatMessage.updateMany(
//         {
//           roomId,
//           sender: { $ne: socket.userId },
//           isRead: false,
//         },
//         { isRead: true, readAt: new Date() },
//       );

//       await ChatRoom.findOneAndUpdate({ roomId }, { unreadCount: 0 });

//       // Notify sender their messages were read
//       socket.to(roomId).emit("messages_read", { roomId });
//     });

//     // ─────────────────────────────────────────
//     // User disconnects
//     // ─────────────────────────────────────────
//     socket.on("disconnect", async () => {
//       console.log(`Socket disconnected: ${socket.id}`);

//       if (socket.userId) {
//         onlineUsers.delete(socket.userId);

//         // If merchant, mark offline
//         if (socket.userRole === "merchant") {
//           const roomId = `room_${socket.userId}`;
//           await ChatRoom.findOneAndUpdate(
//             { roomId },
//             { isMerchantOnline: false },
//           );
//           socket.broadcast.emit("user_offline", { userId: socket.userId });
//         }
//       }
//     });
//   });
// };

///////////////// ======================= lates version (by claod io) =================== ///////////////////

import ChatMessage from "../models/chatMessage.model.js";
import ChatRoom from "../models/ChatRoom.model.js";
import User from "../models/user.model.js";

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

      const user = await User.findById(userId);

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

        socket.emit("auto_assigned", { count: waitingRooms.length });
      }

      // FIX: was socket.broadcast.emit — changed to io.emit so the admin
      // dashboard itself also receives the user_online update for its own
      // query cache (queryClient.setQueryData in AdminChat.jsx listens to this)
      io.emit("user_online", { userId, role });
    });

    // ─────────────────────────────────────────
    // Sound notification toggle
    // ─────────────────────────────────────────
    socket.on("toggle_sound", async ({ enabled }) => {
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, { soundEnabled: enabled });
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
    // User comes online (merchant side emits this)
    // ─────────────────────────────────────────
    socket.on("user_online", async ({ userId, role }) => {
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;
      socket.userRole = role;

      console.log(`User online: ${userId} (${role})`);

      if (role === "merchant") {
        const roomId = `room_${userId}`;
        await ChatRoom.findOneAndUpdate({ roomId }, { isMerchantOnline: true });
      }

      // FIX: was socket.broadcast.emit — io.emit ensures the sending
      // socket's own admin panel also updates the online dot instantly
      io.emit("user_online", { userId, role });
    });

    // ─────────────────────────────────────────
    // Join a chat room
    // ─────────────────────────────────────────
    socket.on("join_room", ({ roomId }) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room: ${roomId}`);
    });

    // ─────────────────────────────────────────
    // Send a message — CORE FIX
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
        // Resolve senderId: socket.userId is set on join, but frontend also
        // sends sender/senderId as fallback in case socket.userId is missing
        const senderId = socket.userId || data.sender || data.senderId || null;

        // Resolve senderRole: same fallback approach
        const senderRole = socket.userRole || data.senderRole || "merchant";

        if (!senderId) {
          console.error("[Chat] send_message: no senderId, dropping message");
          socket.emit("message_error", { error: "Not authenticated" });
          return;
        }

        // Save to DB
        const newMessage = await ChatMessage.create({
          roomId,
          sender: senderId,
          senderRole,
          senderName,
          senderAvatar,
          message,
          messageType,
          imageUrl,
        });

        // FIX: unreadCount should only increment for merchant messages
        // (admin messages don't need a badge on the admin side)
        const unreadIncrement = senderRole === "merchant" ? 1 : 0;

        await ChatRoom.findOneAndUpdate(
          { roomId },
          {
            lastMessage: messageType === "image" ? "[Image]" : message,
            lastMessageTime: new Date(),
            $inc: { unreadCount: unreadIncrement },
          },
        );

        // Build the canonical message object (use DB id, not temp id)
        const broadcastMsg = {
          _id: newMessage._id,
          roomId,
          sender: senderId,
          senderRole,
          senderName,
          senderAvatar,
          message,
          messageType,
          imageUrl,
          isRead: false,
          createdAt: newMessage.createdAt,
        };

        // Broadcast to everyone in the room (covers both admin and merchant
        // already joined to this roomId channel)
        io.to(roomId).emit("new_message", broadcastMsg);

        // ── FIX: Cross-side notifications ──────────────────────────────
        if (senderRole === "merchant") {
          // Merchant → Admin: emit to ALL connected sockets so any admin
          // (superAdmin or merchantAdmin) not currently in this room still
          // gets a notification event they can use for a toast/badge
          io.emit("new_merchant_message", {
            roomId,
            senderName,
            message: messageType === "image" ? "[Image]" : message,
            messageType,
          });
        } else {
          // Admin → Merchant: find the merchant's socket and send a direct
          // notification so they're alerted even if the chat isn't focused
          const room = await ChatRoom.findOne({ roomId });
          if (room?.merchantUser) {
            const merchantSocketId = onlineUsers.get(
              room.merchantUser.toString(),
            );
            if (merchantSocketId) {
              io.to(merchantSocketId).emit("new_admin_message", {
                roomId,
                senderName,
                senderRole,
                message: messageType === "image" ? "[Image]" : message,
                messageType,
              });
            }
          }
        }
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("message_error", { error: "Failed to send message" });
      }
    });

    // ─────────────────────────────────────────
    // Typing indicator
    // FIX: forward the `role` field so both sides can filter correctly
    // (AdminChat shows bubble only for merchant, ChatWidget only for admin)
    // ─────────────────────────────────────────
    socket.on("typing", ({ roomId, isTyping, role }) => {
      socket.to(roomId).emit("typing_indicator", {
        userId: socket.userId,
        // Use role from payload; fall back to socket.userRole
        role: role || socket.userRole,
        isTyping,
      });
    });

    // ─────────────────────────────────────────
    // Mark messages as read
    // FIX: also emit messages_read back into the room so the sender's
    // "Sent → Read" tick updates in real time
    // ─────────────────────────────────────────
    socket.on("mark_read", async ({ roomId }) => {
      await ChatMessage.updateMany(
        { roomId, sender: { $ne: socket.userId }, isRead: false },
        { isRead: true, readAt: new Date() },
      );

      await ChatRoom.findOneAndUpdate({ roomId }, { unreadCount: 0 });

      // FIX: was socket.to(roomId) — use io.to so the reader's own
      // socket also receives the event (needed when admin opens a room
      // and we want to clear the badge on their own screen too)
      io.to(roomId).emit("messages_read", { roomId });
    });

    // ─────────────────────────────────────────
    // Explicit user_offline (merchant navigates away before disconnect)
    // ─────────────────────────────────────────
    socket.on("user_offline", async ({ userId }) => {
      if (!userId) return;
      onlineUsers.delete(String(userId));

      await ChatRoom.findOneAndUpdate(
        { merchantUser: userId },
        { isMerchantOnline: false },
      );

      io.emit("user_offline", { userId });
    });

    // ─────────────────────────────────────────
    // Disconnect
    // ─────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.id}`);

      if (socket.userId) {
        onlineUsers.delete(socket.userId);

        if (socket.userRole === "merchant") {
          const roomId = `room_${socket.userId}`;
          await ChatRoom.findOneAndUpdate(
            { roomId },
            { isMerchantOnline: false },
          );
        }

        // FIX: was socket.broadcast.emit — io.emit ensures ALL clients
        // (including any admin tab on the same session) receive the offline event
        io.emit("user_offline", { userId: socket.userId });
      }
    });
  });
};
