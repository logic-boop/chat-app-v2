"use client";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import EmojiPicker from "emoji-picker-react"; // Run: npm install emoji-picker-react

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [message, setMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const socket = useRef(null);
  const lastMessageRef = useRef(null);

  // 1. Socket Initialization & Listeners
  useEffect(() => {
    socket.current = io("http://localhost:3001");

    socket.current.on("receive_message", (data) => {
      setMessageList((list) => [...list, data]);
      // If we are logged in and receive a message from someone else, mark it as read
      if (isLoggedIn) {
        socket.current.emit("mark_as_read", username);
      }
    });

    socket.current.on("message_history", (history) => {
      setMessageList(history);
    });

    socket.current.on("messages_updated", (updatedHistory) => {
      setMessageList(updatedHistory);
    });

    return () => {
      socket.current.disconnect();
    };
  }, [isLoggedIn, username]);

  // 2. Auto-scroll and Mark as Read on new messages
  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
    if (isLoggedIn && messageList.length > 0) {
      socket.current.emit("mark_as_read", username);
    }
  }, [messageList, isLoggedIn, username]);

  const handleSignup = async () => {
    if (username && password) {
      try {
        const response = await fetch("http://localhost:3001/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        alert(data.message);
        if (response.ok) setAuthMode("login");
      } catch (err) {
        alert("Signup failed.");
      }
    }
  };

  const handleLogin = async () => {
    if (username && password) {
      try {
        const response = await fetch("http://localhost:3001/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (response.ok) {
          setIsLoggedIn(true);
          socket.current.emit("join_chat", username);
        } else {
          alert(data.message);
        }
      } catch (error) {
        alert("Server error.");
      }
    }
  };

  const sendMessage = () => {
    if (message !== "") {
      const messageData = {
        author: username,
        message: message,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "delivered", // Initial status
      };

      socket.current.emit("send_message", messageData);
      // We don't manually add to list here anymore because
      // the server emits 'receive_message' to everyone including us.
      setMessage("");
      setShowEmojiPicker(false);
    }
  };

  const onEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
  };

  return (
    <div className="flex h-screen w-full bg-slate-900 overflow-hidden font-sans text-black">
      {!isLoggedIn ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-2xl">
            <h2 className="text-3xl font-extrabold text-center text-gray-900">
              {authMode === "login" ? "Welcome Back" : "Create Account"}
            </h2>
            <div className="mt-8 space-y-4">
              <input
                type="text"
                placeholder="Username"
                className="block w-full rounded-xl border p-3 outline-none"
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                className="block w-full rounded-xl border p-3 outline-none"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                onClick={authMode === "login" ? handleLogin : handleSignup}
                className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white"
              >
                {authMode === "login" ? "Sign In" : "Register"}
              </button>
              <p
                className="text-center text-sm cursor-pointer text-blue-600"
                onClick={() =>
                  setAuthMode(authMode === "login" ? "signup" : "login")
                }
              >
                {authMode === "login"
                  ? "New here? Sign up"
                  : "Have an account? Log in"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex w-full h-full bg-[#f0f2f5]">
          <div className="hidden md:flex w-80 flex-col bg-white border-r">
            <div className="p-4 bg-blue-600 text-white font-bold text-xl">
              Messenger
            </div>
            <div className="flex-grow p-4">
              <div className="font-bold">Global Chat</div>
              <div className="text-green-500 text-xs">Active Now</div>
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => window.location.reload()}
                className="text-red-500 font-bold"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col h-full relative">
            <div className="flex items-center p-4 bg-white border-b shadow-sm">
              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
                {username[0]?.toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold">{username}</h3>
                <p className="text-xs text-green-500">Online</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5]">
              {messageList.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.author === username ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-1 shadow-md ${msg.author === username ? "bg-[#dcf8c6]" : "bg-white"}`}
                  >
                    <p className="text-[10px] font-bold text-blue-600">
                      {msg.author !== username && msg.author}
                    </p>
                    <p className="text-sm">{msg.message}</p>
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[9px] text-gray-500">
                        {msg.time}
                      </span>
                      {msg.author === username && (
                        <span
                          className={`text-xs font-bold ${msg.status === "read" ? "text-blue-500" : "text-gray-400"}`}
                        >
                          ✓✓
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={lastMessageRef} />
            </div>

            <div className="p-3 bg-white border-t flex flex-col gap-2">
              {showEmojiPicker && (
                <div className="absolute bottom-20 left-4 z-50">
                  <EmojiPicker onEmojiClick={onEmojiClick} />
                </div>
              )}
              <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-xl"
                >
                  😊
                </button>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none outline-none"
                />
                <button
                  onClick={sendMessage}
                  className="text-blue-600 font-bold"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
