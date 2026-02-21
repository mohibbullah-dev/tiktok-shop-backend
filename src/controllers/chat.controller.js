import ChatRoom from "../models/ChatRoom.model.js";
import ChatMessage from "../models/chatMessage.model.js";
import Merchant from "../models/merchant.model.js";
// import User from "../models/User.js";

// Generate room ID from merchant user ID
export const generateRoomId = (merchantUserId) => {
  return `room_${merchantUserId}`;
};

// ─────────────────────────────────────────
// @desc    Get or create chat room for merchant
// @route   GET /api/chat/room
// @access  merchant only
// ─────────────────────────────────────────
export const getOrCreateRoom = async (req, res) => {
  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const roomId = generateRoomId(req.user._id);

  // Find existing room or create new one
  let room = await ChatRoom.findOne({ roomId }).populate(
    "assignedAgent",
    "username avatar role",
  );

  if (!room) {
    room = await ChatRoom.create({
      roomId,
      merchant: merchant._id,
      merchantUser: req.user._id,
      status: "waiting",
    });
  }

  res.json(room);
};

// ─────────────────────────────────────────
// @desc    Get chat history for a room
// @route   GET /api/chat/messages/:roomId
// @access  merchant, superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const getChatHistory = async (req, res) => {
  const { roomId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  // Verify access
  if (req.user.role === "merchant") {
    const expectedRoomId = generateRoomId(req.user._id);
    if (roomId !== expectedRoomId) {
      return res.status(403).json({ message: "Not authorized" });
    }
  }

  const total = await ChatMessage.countDocuments({ roomId });

  const messages = await ChatMessage.find({ roomId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  // Return in chronological order
  messages.reverse();

  res.json({
    messages,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
};

// ─────────────────────────────────────────
// @desc    Get all chat rooms (admin)
// @route   GET /api/chat/rooms
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const getAllRooms = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;

  // merchantAdmin only sees their merchants
  if (req.user.role === "merchantAdmin") {
    const referredMerchants = await Merchant.find({
      referrer: req.user._id,
    }).select("_id");
    filter.merchant = { $in: referredMerchants.map((m) => m._id) };
  }

  const total = await ChatRoom.countDocuments(filter);

  const rooms = await ChatRoom.find(filter)
    .populate("merchant", "storeName merchantId")
    .populate("merchantUser", "username avatar")
    .populate("assignedAgent", "username avatar")
    .sort({ lastMessageTime: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    rooms,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
};

// ─────────────────────────────────────────
// @desc    Assign agent to chat room
// @route   PUT /api/chat/rooms/:roomId/assign
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const assignAgent = async (req, res) => {
  const room = await ChatRoom.findOne({
    roomId: req.params.roomId,
  });

  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }

  room.assignedAgent = req.user._id;
  room.status = "active";
  await room.save();

  res.json({ message: "Agent assigned", room });
};

// ─────────────────────────────────────────
// @desc    Close chat room
// @route   PUT /api/chat/rooms/:roomId/close
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const closeRoom = async (req, res) => {
  const room = await ChatRoom.findOne({
    roomId: req.params.roomId,
  });

  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }

  room.status = "closed";
  await room.save();

  res.json({ message: "Chat room closed", room });
};

// ─────────────────────────────────────────
// @desc    Mark all messages in room as read
// @route   PUT /api/chat/rooms/:roomId/read
// @access  merchant, superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const markRoomAsRead = async (req, res) => {
  await ChatMessage.updateMany(
    { roomId: req.params.roomId, isRead: false },
    { isRead: true, readAt: new Date() },
  );

  // Reset unread count
  await ChatRoom.findOneAndUpdate(
    { roomId: req.params.roomId },
    { unreadCount: 0 },
  );

  res.json({ message: "Messages marked as read" });
};
