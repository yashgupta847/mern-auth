const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/authMiddleware");
const sendOtp = require('../sendOtp');
const User = require("../models/User");
const tempUsers = require("../tempUsers");

let otpStore = {}; // Temporary memory store for password reset OTPs

// ✅ Test Route
router.get("/test", (req, res) => {
  res.send("Auth Route Working 🚀");
});

// ✅ Signup (store in temp + send OTP)
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    const userData = { name, email, password };
    tempUsers.set(email, { otp, userData });

    sendOtp(email, otp);

    res.status(200).json({
      message: "OTP sent to your email. Please verify to complete signup.",
    });
  } catch (err) {
    console.error("Signup OTP Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Verify OTP (Signup)// ✅ BACKEND: verify-otp route with debug logs
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  console.log("Verifying OTP for:", email);
  console.log("Entered OTP:", otp);

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const storedData = tempUsers.get(email);
  console.log("Stored data:", storedData);

  if (!storedData) {
    return res.status(400).json({ message: "No OTP request found for this email" });
  }

  if (storedData.otp.toString() !== otp.toString()) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  try {
    const hashedPassword = await bcrypt.hash(storedData.userData.password, 10);
    const newUser = new User({
      name: storedData.userData.name,
      email: storedData.userData.email,
      password: hashedPassword,
    });

    await newUser.save();
    tempUsers.delete(email);

    console.log("✅ User registered successfully:", newUser.email);
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("OTP Verification Error:", err);
    res.status(500).json({ message: "Error creating user" });
  }
});



// ✅ Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Protected Route
router.get("/protected", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.status(200).json({
      message: "Protected route accessed 🚀",
      userId: user._id,
      name: user.name,
    });
  } catch (err) {
    console.error("Protected route error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Send OTP (for password reset)
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore[email] = { otp, expiresAt };

    sendOtp(email, otp);
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("OTP send error:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

// ✅ Verify OTP (for password reset only)
router.post("/verify-reset-otp", (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record)
    return res.status(400).json({ message: "No OTP found for this email" });

  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res.status(400).json({ message: "OTP expired" });
  }

  if (parseInt(record.otp) !== parseInt(otp)) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  res.status(200).json({ message: "OTP verified" });
});

// ✅ Reset Password
router.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    delete otpStore[email];

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Password reset error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
