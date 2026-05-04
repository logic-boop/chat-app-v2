"use client";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [message, setMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [typingStatus, setTypingStatus] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("emoji");
  const [theme, setTheme] = useState("dark"); // Defaulting to Dark for that "Pro" feel

  const socket = useRef(null);
  const lastMessageRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const stickers = [
    "/stickers/sticker1.png",
    "/stickers/sticker2.png",
    "/stickers/sticker3.png",
  ];

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    if (savedTheme === "dark") document.documentElement.classList.add("dark");

    const savedToken = localStorage.getItem("chat_token");
    const savedUser = localStorage.getItem("chat_user");
    if (savedToken && savedUser) {
      setUsername(savedUser);
      setIsLoggedIn(true);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", newTheme);
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    socket.current = io(API_URL);
    socket.current.emit("join_chat", username);

    socket.current.on("receive_message", (data) => {
      setMessageList((list) => [...list, data]);
      setTypingStatus("");
    });

    socket.current.on("update_user_list", (users) => setActiveUsers(users));

    socket.current.on("display_typing", (data) => {
      if (data.typing && data.user !== username) {
        setTypingStatus(`${data.user} is typing...`);
      } else {
        setTypingStatus("");
      }
    });

    socket.current.on("message_history", (history) => setMessageList(history));
    socket.current.on("messages_updated", (updatedHistory) =>
      setMessageList(updatedHistory),
    );

    return () => {
      socket.current?.disconnect();
    };
  }, [isLoggedIn, username]);

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
    if (isLoggedIn) socket.current?.emit("mark_as_read", username);
  }, [messageList]);

  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (socket.current) {
      socket.current.emit("typing", { user: username, typing: true });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.current.emit("typing", { user: username, typing: false });
      }, 1500);
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
          setIsLoggedIn(true);
        } else {
          alert(data.message);
        }
      } catch {
        alert("Server error.");
      }
    }
  };

  const sendMessage = () => {
    if (message.trim() && socket.current) {
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
      socket.current.emit("send_message", {
        author: username,
        message: stickerUrl,
        type: "sticker",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      setShowEmojiPicker(false);
    }
  };

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-[#0b0f1a] text-slate-900 dark:text-slate-100 transition-colors duration-500 overflow-hidden font-sans">
      {!isLoggedIn ? (
        <div className="flex h-full items-center justify-center p-6 bg-gradient-to-br from-blue-600 to-purple-700">
          {/* Modern Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl shadow-2xl"
          >
            <h2 className="text-4xl font-black text-center text-white mb-8">
              NexusStream
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Username"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-white/50 outline-none focus:ring-2 ring-blue-400 transition-all"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-white/50 outline-none focus:ring-2 ring-blue-400 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                onClick={handleLogin}
                className="w-full bg-blue-500 hover:bg-blue-400 py-4 rounded-2xl font-bold text-white shadow-lg shadow-blue-500/30 transition-all active:scale-95"
              >
                Enter Terminal
              </button>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="flex h-full">
          {/* Pro Sidebar */}
          <aside className="hidden lg:flex w-80 flex-col bg-white dark:bg-[#0f172a] border-r dark:border-slate-800 shadow-xl z-20">
            <div className="p-6 border-b dark:border-slate-800 flex items-center justify-between">
              <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                NEXUS
              </span>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:rotate-12 transition-all"
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                  Active Nodes — {activeUsers.length}
                </p>
                {activeUsers.map((u) => (
                  <div
                    key={u}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-blue-500">
                        {u[0].toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white dark:border-[#0f172a] rounded-full"></span>
                    </div>
                    <span className="font-semibold text-sm">
                      {u === username ? "You" : u}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t dark:border-slate-800">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 rounded-xl text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                Terminate Session
              </button>
            </div>
          </aside>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col relative bg-white dark:bg-[#0b0f1a]">
            <header className="h-20 flex items-center px-8 border-b dark:border-slate-800/60 backdrop-blur-md bg-white/80 dark:bg-[#0b0f1a]/80 z-10">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-black text-xl">
                  G
                </div>
                <div>
                  <h2 className="font-bold text-lg">Main Deck</h2>
                  <p className="text-xs text-green-500 font-bold animate-pulse">
                    ● System Online
                  </p>
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-slate-50/50 dark:bg-transparent">
              {messageList.map((msg, index) => {
                const isMe = msg.author === username;
                return (
                  <motion.div
                    initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={index}
                    className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-3`}
                  >
                    {!isMe && (
                      <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                        {msg.author[0]}
                      </div>
                    )}
                    <div
                      className={`relative max-w-[70%] p-4 rounded-3xl shadow-sm ${isMe ? "bg-blue-600 text-white rounded-br-none" : "bg-white dark:bg-slate-800 dark:border dark:border-slate-700 rounded-bl-none"}`}
                    >
                      {!isMe && (
                        <p className="text-[10px] font-black uppercase opacity-50 mb-1">
                          {msg.author}
                        </p>
                      )}
                      {msg.type === "sticker" ? (
                        <img src={msg.message} className="w-32 h-auto" />
                      ) : (
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-2 opacity-40">
                        <span className="text-[9px]">{msg.time}</span>
                        {isMe && (
                          <span className="text-xs">
                            {msg.status === "read" ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={lastMessageRef} />
            </main>

            {/* Floating Typing Indicator */}
            <AnimatePresence>
              {typingStatus && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-28 left-8 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-xl border dark:border-slate-700 text-[10px] font-bold text-blue-500 italic"
                >
                  {typingStatus}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Glassmorphic Input Bar */}
            <footer className="p-6">
              <div className="max-w-4xl mx-auto relative">
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute bottom-24 left-0 z-50"
                    >
                      <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-3xl border dark:border-slate-700 overflow-hidden flex flex-col w-[350px] h-[450px]">
                        <div className="flex p-2 gap-2 bg-slate-50 dark:bg-slate-800">
                          <button
                            onClick={() => setPickerMode("emoji")}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${pickerMode === "emoji" ? "bg-white dark:bg-slate-900 shadow-sm" : "opacity-50"}`}
                          >
                            EMOJI
                          </button>
                          <button
                            onClick={() => setPickerMode("sticker")}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${pickerMode === "sticker" ? "bg-white dark:bg-slate-900 shadow-sm" : "opacity-50"}`}
                          >
                            STICKER
                          </button>
                        </div>
                        <div className="flex-1">
                          {pickerMode === "emoji" ? (
                            <EmojiPicker
                              onEmojiClick={(e) =>
                                setMessage((p) => p + e.emoji)
                              }
                              theme={
                                theme === "dark" ? Theme.DARK : Theme.LIGHT
                              }
                              width="100%"
                              height="100%"
                            />
                          ) : (
                            <div className="grid grid-cols-3 gap-2 p-4">
                              {stickers.map((s, i) => (
                                <img
                                  key={i}
                                  src={s}
                                  onClick={() => sendSticker(s)}
                                  className="cursor-pointer hover:scale-110 transition-transform p-2 bg-slate-50 dark:bg-slate-800 rounded-xl"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-4 bg-white dark:bg-slate-800/50 backdrop-blur-2xl border dark:border-slate-700 p-2 pl-6 rounded-3xl shadow-2xl ring-1 ring-black/5">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="text-2xl hover:scale-125 transition-transform"
                  >
                    ✨
                  </button>
                  <input
                    type="text"
                    value={message}
                    onChange={handleTyping}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Transmit data..."
                    className="flex-1 bg-transparent outline-none py-3 text-sm"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!message.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-20 text-white p-3 px-6 rounded-2xl font-bold text-xs transition-all flex items-center gap-2"
                  >
                    SEND
                    <svg
                      className="w-4 h-4 rotate-90"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
