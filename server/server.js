const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

app.use(cors());
app.use(express.json());

const SECRET_KEY = "your_super_secret_key_here";
const USER_FILE = "./users.json";
const MESSAGES_FILE = "./messages.json";

// Helpers
const getUsers = () => {
  try {
    const data = fs.readFileSync(USER_FILE, "utf8");
    return data ? JSON.parse(data) : [];
  } catch (err) {
    return [];
  }
};

const getMessages = () => {
  try {
    const data = fs.readFileSync(MESSAGES_FILE, "utf8");
    return data ? JSON.parse(data) : [];
  } catch (err) {
    return [];
  }
};

const saveMessages = (messages) => {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
};

// Auth Routes
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  if (users.find((u) => u.username === username))
    return res.status(400).json({ message: "Exists" });
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword });
  fs.writeFileSync(USER_FILE, JSON.stringify(users, null, 2));
  res.status(201).json({ message: "Created" });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  const user = users.find((u) => u.username === username);
  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign({ username: user.username }, SECRET_KEY, {
      expiresIn: "24h",
    });
    res.json({ token, username: user.username });
  } else {
    res.status(401).json({ message: "Fail" });
  }
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:3000" } });

// --- SOCKET LOGIC ---
io.on("connection", (socket) => {
  socket.on("join_chat", (username) => {
    socket.username = username; // Attach username to socket session
    const history = getMessages();
    socket.emit("message_history", history);
  });

  socket.on("send_message", (data) => {
    const messages = getMessages();
    const newMessage = {
      ...data,
      id: Date.now() + Math.random(), // Unique ID for read receipts
      status: "delivered", // WhatsApp 'double gray check'
    };
    messages.push(newMessage);
    saveMessages(messages);

    io.emit("receive_message", newMessage); // Send to EVERYONE including sender
  });

  // --- READ RECEIPT LOGIC ---
  socket.on("mark_as_read", (readerName) => {
    let messages = getMessages();
    let changed = false;

    messages = messages.map((msg) => {
      if (msg.author !== readerName && msg.status !== "read") {
        msg.status = "read"; // WhatsApp 'double blue check'
        changed = true;
      }
      return msg;
    });

    if (changed) {
      saveMessages(messages);
      io.emit("messages_updated", messages); // Tell everyone to turn their checks blue
    }
  });

  socket.on("disconnect", () => {});
});

server.listen(3001, () => console.log("RUNNING"));
