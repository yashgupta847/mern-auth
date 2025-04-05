const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors"); // 👈 Correct

dotenv.config();

const app = express(); // ✅ This must come before using app

// ✅ CORS setup
app.use(
  cors({
    origin: "https://mern-auth-frontend-one-inky.vercel.app",
    credentials: true,
  })
);

app.use(express.json()); // ✅ Parse JSON

// ✅ Routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected!"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
