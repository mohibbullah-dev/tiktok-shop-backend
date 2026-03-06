import Attendance from "../models/attendance.model.js";
import Merchant from "../models/merchant.model.js";
import Transaction from "../models/transaction.model.js";

// desc    Daily sign-in
// route   POST /api/attendance/sign-in
// access  merchant only

// desc    Daily sign-in
// route   POST /api/attendance/sign-in
// access  merchant only
export const signIn = async (req, res) => {
  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  // ─── YOUR NEW SECURITY CHECK ───
  if (merchant.status !== "approved") {
    return res.status(403).json({
      message:
        "Only fully approved merchants can claim daily rewards. Please wait for Admin approval.",
    });
  }

  // Get today's date as string YYYY-MM-DD
  const todayStr = new Date().toISOString().split("T")[0];

  // Check if already signed in today
  const alreadySigned = await Attendance.findOne({
    merchant: merchant._id,
    signInDate: todayStr,
  });

  if (alreadySigned) {
    return res.status(400).json({ message: "Already signed in today" });
  }

  // Check consecutive days (Did they sign in yesterday?)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const yesterdaySignIn = await Attendance.findOne({
    merchant: merchant._id,
    signInDate: yesterdayStr,
  });

  // Update consecutive count
  if (yesterdaySignIn) {
    merchant.consecutiveSignIns += 1;
  } else {
    merchant.consecutiveSignIns = 1; // Reset to 1 if they missed a day
  }

  // ─── THE NEW SMART FINANCIAL LOGIC ───
  // Base reward is $0.25. Add $0.5 for each consecutive day, capped at $2.00 max.
  let reward = 0.25;
  if (merchant.consecutiveSignIns === 2) reward = 0.5;
  if (merchant.consecutiveSignIns === 3) reward = 0.75;
  if (merchant.consecutiveSignIns >= 4) reward = 1.0;

  merchant.monthlySignIns += 1;
  merchant.lastSignIn = new Date();
  merchant.balance += reward;
  merchant.totalIncome += reward;

  await merchant.save();

  // Create attendance record
  const attendance = await Attendance.create({
    merchant: merchant._id,
    signInDate: todayStr,
    reward,
  });

  // Record transaction
  await Transaction.create({
    merchant: merchant._id,
    linkedId: todayStr,
    amount: reward,
    balanceAfter: merchant.balance,
    type: "signInBonus",
  });

  res.status(201).json({
    message: `Sign in successful! You earned $${reward.toFixed(2)}`,
    reward,
    consecutiveSignIns: merchant.consecutiveSignIns,
    newBalance: merchant.balance,
    attendance,
  });
};

// desc    Get sign-in calendar for merchant
// route   GET /api/attendance/calendar
// access  merchant only

export const getCalendar = async (req, res) => {
  const { year, month } = req.query;

  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  // Default to current year/month
  const targetYear = year || new Date().getFullYear();
  const targetMonth = month || new Date().getMonth() + 1;

  // Build date range for the month
  const startDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
  const endDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-31`;

  const records = await Attendance.find({
    merchant: merchant._id,
    signInDate: { $gte: startDate, $lte: endDate },
  }).sort({ signInDate: 1 });

  // Check if signed in today
  const todayStr = new Date().toISOString().split("T")[0];
  const signedToday = records.some((r) => r.signInDate === todayStr);

  res.json({
    records,
    consecutiveSignIns: merchant.consecutiveSignIns,
    monthlySignIns: merchant.monthlySignIns,
    signedToday,
    currentMonth: `${targetYear}-${String(targetMonth).padStart(2, "0")}`,
  });
};

// desc    Get all attendance records (admin)
// route   GET /api/attendance
// access  superAdmin only

export const getAllAttendance = async (req, res) => {
  const { merchantId, page = 1, limit = 10 } = req.query;

  const filter = {};

  if (merchantId) {
    const merchant = await Merchant.findOne({ merchantId });
    if (merchant) filter.merchant = merchant._id;
  }

  const total = await Attendance.countDocuments(filter);

  const records = await Attendance.find(filter)
    .populate("merchant", "storeName merchantId")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    records,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
};

// desc    Revoke attendance record and deduct funds
// route   DELETE /api/attendance/:id
// access  superAdmin only
export const revokeAttendance = async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    const merchant = await Merchant.findById(record.merchant);
    if (merchant) {
      // 1. Take the reward money back from the merchant
      merchant.balance -= record.reward;
      merchant.totalIncome -= record.reward;
      await merchant.save();

      // 2. Record a penalty transaction so the merchant knows why money vanished
      await Transaction.create({
        merchant: merchant._id,
        linkedId: record.signInDate,
        amount: -record.reward,
        balanceAfter: merchant.balance,
        type: "penalty", // Indicates funds were revoked
      });
    }

    // 3. Delete the attendance record
    await record.deleteOne();

    res.json({ message: "Attendance revoked and funds deducted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
