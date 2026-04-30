require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.JWT_SECRET || "dev_secret_key";
const MONGO_URI = process.env.MONGO_URI;

// --- DATABASE CONNECTION ---
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ Connection Error:", err));

// --- MODELS ---
const User = mongoose.model(
  "User",
  new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
  }),
);

const Message = mongoose.model(
  "Message",
  new mongoose.Schema({
    author: String,
    message: String,
    type: String,
    time: String,
    status: { type: String, default: "delivered" },
    createdAt: { type: Date, default: Date.now },
  }),
);

// --- AUTH ROUTES ---

app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required." });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Incorrect username or password." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "Account created successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Server error during registration." });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ message: "Incorrect username or password." });
    }

    const token = jwt.sign({ username: user.username }, SECRET_KEY, {
      expiresIn: "24h",
    });
    res.json({ token, username: user.username, message: "Login successful!" });
  } catch (err) {
    res.status(500).json({ message: "Server error during login." });
  }
});

// --- SOCKET LOGIC ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Keep track of active users in memory
let activeUsers = new Set();

io.on("connection", (socket) => {
  socket.on("join_chat", async (username) => {
    socket.username = username;
    activeUsers.add(username);

    // Broadcast updated user list to everyone
    io.emit("update_user_list", Array.from(activeUsers));

    const history = await Message.find().sort({ createdAt: 1 }).limit(50);
    socket.emit("message_history", history);
  });

  socket.on("send_message", async (data) => {
    try {
      const newMessage = new Message({ ...data, status: "delivered" });
      await newMessage.save();
      io.emit("receive_message", newMessage);
    } catch (err) {
      console.error("Msg Error:", err);
    }
  });

  // Typing Indicator Logic
  socket.on("typing", (data) => {
    // Broadcast to everyone except the sender
    socket.broadcast.emit("display_typing", data);
  });

  socket.on("mark_as_read", async (readerName) => {
    try {
      await Message.updateMany(
        { author: { $ne: readerName }, status: { $ne: "read" } },
        { $set: { status: "read" } },
      );
      const updatedHistory = await Message.find()
        .sort({ createdAt: 1 })
        .limit(50);
      io.emit("messages_updated", updatedHistory);
    } catch (err) {
      console.error("Read Receipt Error:", err);
    }
  });

  socket.on("disconnect", () => {
    if (socket.username) {
      activeUsers.delete(socket.username);
      io.emit("update_user_list", Array.from(activeUsers));
    }
    console.log("User Disconnected:", socket.username);
  });
});

server.listen(PORT, () =>
  console.log(`🚀 Production Server running on port ${PORT}`),
);
