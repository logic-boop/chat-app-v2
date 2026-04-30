"use client";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import EmojiPicker, { Theme } from "emoji-picker-react";

// Fallback to localhost if the environment variable isn't set
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [message, setMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]); // NEW: Online users state
  const [typingStatus, setTypingStatus] = useState(""); // NEW: Typing indicator state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("emoji");
  const [theme, setTheme] = useState("light");

  const socket = useRef(null);
  const lastMessageRef = useRef(null);
  const typingTimeoutRef = useRef(null); // Ref to manage typing timeout

  const stickers = [
    "/stickers/sticker1.png",
    "/stickers/sticker2.png",
    "/stickers/sticker3.png",
  ];

  // 1. PERSISTENCE & THEME: Check localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }

    const savedToken = localStorage.getItem("chat_token");
    const savedUser = localStorage.getItem("chat_user");
    if (savedToken && savedUser) {
      setUsername(savedUser);
      setIsLoggedIn(true);
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // 2. SOCKET CONNECTION & EVENT LISTENERS
  useEffect(() => {
    if (!isLoggedIn) return;

    socket.current = io(API_URL);

    socket.current.emit("join_chat", username);

    socket.current.on("receive_message", (data) => {
      setMessageList((list) => [...list, data]);
      setTypingStatus(""); // Clear typing if message received
    });

    socket.current.on("update_user_list", (users) => {
      setActiveUsers(users);
    });

    socket.current.on("display_typing", (data) => {
      if (data.typing) {
        setTypingStatus(`${data.user} is typing...`);
      } else {
        setTypingStatus("");
      }
    });

    socket.current.on("message_history", (history) => {
      setMessageList(history);
    });

    socket.current.on("messages_updated", (updatedHistory) => {
      setMessageList(updatedHistory);
    });

    return () => {
      socket.current?.disconnect();
    };
  }, [isLoggedIn, username]);

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
    if (isLoggedIn && messageList.length > 0) {
      socket.current?.emit("mark_as_read", username);
    }
  }, [messageList, isLoggedIn, username]);

  // Handle Typing logic (Debounced)
  const handleTyping = (e) => {
    setMessage(e.target.value);

    if (socket.current) {
      socket.current.emit("typing", { user: username, typing: true });

      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.current.emit("typing", { user: username, typing: false });
      }, 2000);
    }
  };

  // 3. AUTH LOGIC
  const handleSignup = async () => {
    if (username && password) {
      try {
        const response = await fetch(`${API_URL}/signup`, {
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
        const response = await fetch(`${API_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (response.ok) {
          localStorage.setItem("chat_token", data.token);
          localStorage.setItem("chat_user", data.username);
          setUsername(data.username);
          setIsLoggedIn(true);
        } else {
          alert(data.message);
        }
      } catch (error) {
        alert("Server error.");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("chat_token");
    localStorage.removeItem("chat_user");
    window.location.reload();
  };

  const sendMessage = () => {
    if (message.trim() !== "" && socket.current) {
      const messageData = {
        author: username,
        message: message,
        type: "text",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      socket.current.emit("send_message", messageData);
      socket.current.emit("typing", { user: username, typing: false });
      setMessage("");
      setShowEmojiPicker(false);
    }
  };

  const sendSticker = (stickerUrl) => {
    if (socket.current) {
      const messageData = {
        author: username,
        message: stickerUrl,
        type: "sticker",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      socket.current.emit("send_message", messageData);
      setShowEmojiPicker(false);
    }
  };

  const onEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
  };

  return (
    <div className={`${theme === "dark" ? "dark" : ""} h-screen w-full`}>
      <div className="flex h-full w-full bg-slate-900 dark:bg-slate-950 overflow-hidden font-sans transition-colors duration-300">
        {!isLoggedIn ? (
          <div className="flex flex-1 items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white dark:bg-slate-900 p-10 shadow-2xl transition-colors">
              <h2 className="text-3xl font-extrabold text-center text-gray-900 dark:text-white">
                {authMode === "login" ? "Welcome Back" : "Create Account"}
              </h2>
              <div className="mt-8 space-y-4">
                <input
                  type="text"
                  placeholder="Username"
                  className="block w-full rounded-xl border dark:border-slate-700 bg-transparent dark:text-white p-3 outline-none"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Password"
                  className="block w-full rounded-xl border dark:border-slate-700 bg-transparent dark:text-white p-3 outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  onClick={authMode === "login" ? handleLogin : handleSignup}
                  className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition-all hover:bg-blue-700"
                >
                  {authMode === "login" ? "Sign In" : "Register"}
                </button>
                <p
                  className="text-center text-sm cursor-pointer text-blue-600 hover:underline"
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
          <div className="flex w-full h-full bg-[#f0f2f5] dark:bg-slate-950">
            {/* Sidebar */}
            <div className="hidden md:flex w-80 flex-col bg-white dark:bg-slate-900 border-r dark:border-slate-800 transition-colors">
              <div className="p-4 bg-blue-600 text-white font-bold text-xl flex items-center justify-between">
                <span>💬 Messenger</span>
                <button
                  onClick={toggleTheme}
                  className="p-1 hover:bg-blue-700 rounded-lg text-lg"
                >
                  {theme === "light" ? "🌙" : "☀️"}
                </button>
              </div>
              <div className="flex-grow p-4 overflow-y-auto">
                {/* Global Chat Item */}
                <div className="flex items-center p-3 bg-gray-100 dark:bg-slate-800 rounded-xl mb-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    G
                  </div>
                  <div>
                    <div className="font-bold text-sm text-gray-800 dark:text-gray-200">
                      Global Chat
                    </div>
                    <div className="text-green-500 text-[10px] flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>{" "}
                      Active Now
                    </div>
                  </div>
                </div>

                {/* Active Users List */}
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-bold text-gray-400 uppercase px-2">
                    Online — {activeUsers.length}
                  </p>
                  {activeUsers.map((u) => (
                    <div
                      key={u}
                      className="flex items-center p-2 rounded-lg text-sm dark:text-gray-200"
                    >
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                      {u === username ? `${u} (You)` : u}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t dark:border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg"
                >
                  🚪 Logout
                </button>
              </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex flex-1 flex-col h-full relative">
              <header className="flex items-center p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shadow-sm">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold mr-3">
                  {username[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 dark:text-white leading-tight">
                    {username}
                  </h3>
                  <p className="text-[10px] text-green-500 font-medium">
                    Online
                  </p>
                </div>
              </header>

              <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5] dark:bg-slate-800/50">
                {messageList.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.author === username ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-3 py-2 shadow-sm ${msg.author === username ? "bg-[#dcf8c6] dark:bg-blue-600 dark:text-white rounded-tr-none" : "bg-white dark:bg-slate-700 dark:text-gray-100 rounded-tl-none"}`}
                    >
                      {msg.author !== username && (
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-300 mb-1">
                          {msg.author}
                        </p>
                      )}
                      {msg.type === "sticker" ? (
                        <img
                          src={msg.message}
                          alt="sticker"
                          className="w-[140px] h-auto object-contain"
                        />
                      ) : (
                        <p className="text-[13px] md:text-sm">{msg.message}</p>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                        <span className="text-[9px]">{msg.time}</span>
                        {msg.author === username && (
                          <span
                            className={`text-xs ${msg.status === "read" ? "text-blue-500" : "text-gray-400"}`}
                          >
                            {msg.status === "read" ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={lastMessageRef} />
              </main>

              {/* Typing Indicator Display */}
              {typingStatus && (
                <div className="absolute bottom-20 left-6 text-xs italic text-gray-500 dark:text-gray-400 animate-pulse">
                  {typingStatus}
                </div>
              )}

              <footer className="p-3 bg-white dark:bg-slate-900 border-t dark:border-slate-800 flex flex-col gap-2 relative">
                {showEmojiPicker && (
                  <div className="absolute bottom-20 left-4 z-50 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border dark:border-slate-700 w-[320px] md:w-[350px] h-[450px] overflow-hidden flex flex-col">
                    <div className="flex bg-gray-50 dark:bg-slate-800">
                      <button
                        onClick={() => setPickerMode("emoji")}
                        className={`flex-1 py-3 text-xs font-bold ${pickerMode === "emoji" ? "bg-white dark:bg-slate-900 text-blue-600 border-b-2 border-blue-600" : "text-gray-400"}`}
                      >
                        EMOJIS
                      </button>
                      <button
                        onClick={() => setPickerMode("sticker")}
                        className={`flex-1 py-3 text-xs font-bold ${pickerMode === "sticker" ? "bg-white dark:bg-slate-900 text-blue-600 border-b-2 border-blue-600" : "text-gray-400"}`}
                      >
                        STICKERS
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {pickerMode === "emoji" ? (
                        <EmojiPicker
                          onEmojiClick={onEmojiClick}
                          width="100%"
                          height="100%"
                          theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
                        />
                      ) : (
                        <div className="grid grid-cols-3 gap-3 p-4">
                          {stickers.map((src, i) => (
                            <div
                              key={i}
                              onClick={() => sendSticker(src)}
                              className="aspect-square bg-gray-50 dark:bg-slate-800 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                              <img
                                src={src}
                                alt={`sticker-${i}`}
                                className="w-[85%] h-[85%] object-contain"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 rounded-full px-4 py-2">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="text-xl"
                  >
                    😊
                  </button>
                  <input
                    type="text"
                    value={message}
                    onChange={handleTyping}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent border-none outline-none text-sm dark:text-white"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!message.trim()}
                    className="text-blue-600 dark:text-blue-400 font-bold text-sm px-2 disabled:opacity-30"
                  >
                    SEND
                  </button>
                </div>
              </footer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
