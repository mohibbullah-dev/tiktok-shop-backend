import ChatRoom from "../models/ChatRoom.model.js";
import ChatMessage from "../models/chatMessage.model.js";
import ChatGroup from "../models/ChatGroup.model.js";
import Merchant from "../models/merchant.model.js";
import User from "../models/user.model.js";

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

  // Check if blacklisted
  if (room.isBlacklisted) {
    return res.status(403).json({ message: "You are blacklisted from chat" });
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
  const { status, group, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (group) filter.group = group;

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
// @desc    Get waiting/unclaimed rooms (To be claimed tab)
// @route   GET /api/chat/rooms/unclaimed
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const getUnclaimedRooms = async (req, res) => {
  const filter = {
    status: "waiting",
    assignedAgent: null,
    isBlacklisted: false,
  };

  if (req.user.role === "merchantAdmin") {
    const referredMerchants = await Merchant.find({
      referrer: req.user._id,
    }).select("_id");
    filter.merchant = { $in: referredMerchants.map((m) => m._id) };
  }

  const rooms = await ChatRoom.find(filter)
    .populate("merchant", "storeName merchantId")
    .populate("merchantUser", "username avatar")
    .sort({ createdAt: -1 });

  res.json({ rooms, total: rooms.length });
};

// ─────────────────────────────────────────
// @desc    Assign agent to chat room (manual)
// @route   PUT /api/chat/rooms/:roomId/assign
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const assignAgent = async (req, res) => {
  const room = await ChatRoom.findOne({ roomId: req.params.roomId });
  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }

  room.assignedAgent = req.user._id;
  room.status = "active";
  room.autoAssigned = false;
  await room.save();

  res.json({ message: "Agent assigned", room });
};

// ─────────────────────────────────────────
// @desc    Intelligent auto allocation
// @route   POST /api/chat/rooms/auto-assign
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const autoAssignRooms = async (req, res) => {
  // Find all waiting rooms with no agent
  const waitingRooms = await ChatRoom.find({
    status: "waiting",
    assignedAgent: null,
    isBlacklisted: false,
  });

  if (waitingRooms.length === 0) {
    return res.json({ message: "No waiting rooms to assign" });
  }

  // Assign current admin to all waiting rooms
  let assigned = 0;
  for (const room of waitingRooms) {
    room.assignedAgent = req.user._id;
    room.status = "active";
    room.autoAssigned = true;
    await room.save();
    assigned++;
  }

  res.json({
    message: `${assigned} rooms auto-assigned`,
    assigned,
  });
};

// ─────────────────────────────────────────
// @desc    Toggle blacklist for a merchant
// @route   PUT /api/chat/rooms/:roomId/blacklist
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const toggleBlacklist = async (req, res) => {
  const room = await ChatRoom.findOne({ roomId: req.params.roomId });
  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }

  room.isBlacklisted = !room.isBlacklisted;

  // If blacklisting, close the room
  if (room.isBlacklisted) {
    room.status = "closed";
  }

  await room.save();

  res.json({
    message: room.isBlacklisted
      ? "Merchant blacklisted from chat"
      : "Merchant removed from blacklist",
    isBlacklisted: room.isBlacklisted,
  });
};

// ─────────────────────────────────────────
// @desc    Get blacklisted rooms
// @route   GET /api/chat/rooms/blacklist
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const getBlacklist = async (req, res) => {
  const filter = { isBlacklisted: true };

  if (req.user.role === "merchantAdmin") {
    const referredMerchants = await Merchant.find({
      referrer: req.user._id,
    }).select("_id");
    filter.merchant = { $in: referredMerchants.map((m) => m._id) };
  }

  const rooms = await ChatRoom.find(filter)
    .populate("merchant", "storeName merchantId")
    .populate("merchantUser", "username avatar");

  res.json({ rooms, total: rooms.length });
};

// ─────────────────────────────────────────
// @desc    Create customer group
// @route   POST /api/chat/groups
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const createGroup = async (req, res) => {
  const { name } = req.body;

  if (!name || name.length > 12) {
    return res.status(400).json({
      message: "Group name required and must be 12 characters or less",
    });
  }

  // Check duplicate name for this admin
  const existing = await ChatGroup.findOne({
    name,
    createdBy: req.user._id,
  });

  if (existing) {
    return res.status(400).json({ message: "Group name already exists" });
  }

  const group = await ChatGroup.create({
    name,
    createdBy: req.user._id,
  });

  res.status(201).json({ message: "Group created", group });
};

// ─────────────────────────────────────────
// @desc    Get all groups
// @route   GET /api/chat/groups
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const getGroups = async (req, res) => {
  const groups = await ChatGroup.find({
    createdBy: req.user._id,
    isBlacklist: false,
  });

  // Get member count for each group
  const groupsWithCount = await Promise.all(
    groups.map(async (group) => {
      const count = group.members.length;
      return {
        _id: group._id,
        name: group.name,
        memberCount: count,
        createdAt: group.createdAt,
      };
    }),
  );

  res.json(groupsWithCount);
};

// ─────────────────────────────────────────
// @desc    Add merchant to group
// @route   PUT /api/chat/groups/:groupId/add
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const addToGroup = async (req, res) => {
  const { roomId } = req.body;

  const group = await ChatGroup.findById(req.params.groupId);
  if (!group) {
    return res.status(404).json({ message: "Group not found" });
  }

  const room = await ChatRoom.findOne({ roomId });
  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }

  // Add to group if not already there
  if (!group.members.includes(room._id)) {
    group.members.push(room._id);
    await group.save();
  }

  // Update room's group name
  room.group = group.name;
  await room.save();

  res.json({ message: "Merchant added to group", group });
};

// ─────────────────────────────────────────
// @desc    Delete group
// @route   DELETE /api/chat/groups/:groupId
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const deleteGroup = async (req, res) => {
  const group = await ChatGroup.findById(req.params.groupId);
  if (!group) {
    return res.status(404).json({ message: "Group not found" });
  }

  // Reset all rooms in this group back to general
  await ChatRoom.updateMany({ group: group.name }, { group: "general" });

  await ChatGroup.findByIdAndDelete(req.params.groupId);

  res.json({ message: "Group deleted" });
};

// ─────────────────────────────────────────
// @desc    Toggle sound for agent
// @route   PUT /api/chat/sound
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const toggleSound = async (req, res) => {
  const user = await User.findById(req.user._id);

  // Store sound preference on user model
  // We use a simple approach — store in user's language field
  // Better: add soundEnabled to User model
  user.soundEnabled = !user.soundEnabled;
  await user.save();

  res.json({
    message: `Sound ${user.soundEnabled ? "enabled" : "disabled"}`,
    soundEnabled: user.soundEnabled,
  });
};

// ─────────────────────────────────────────
// @desc    Close chat room
// @route   PUT /api/chat/rooms/:roomId/close
// @access  superAdmin, merchantAdmin
// ─────────────────────────────────────────
export const closeRoom = async (req, res) => {
  const room = await ChatRoom.findOne({ roomId: req.params.roomId });
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

  await ChatRoom.findOneAndUpdate(
    { roomId: req.params.roomId },
    { unreadCount: 0 },
  );

  res.json({ message: "Messages marked as read" });
};
