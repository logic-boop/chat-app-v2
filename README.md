# 💬 Chat-App-V2

A professional full-stack, real-time messaging platform built with **Next.js 15**, **Socket.io**, and **Express**.

## 🚀 Key Features
*   **Real-time Communication**: Instant messaging via WebSockets.
*   **Secure Authentication**: JWT & BcryptJS for protected user accounts.
*   **Persistent History**: Messages saved to a local JSON database.
*   **WhatsApp-style Tracking**: 
    *   `✓✓` (Gray): Delivered to server.
    *   `✓✓` (Blue): Read by recipient.
*   **Expressive UI**: Integrated emoji picker and responsive Tailwind design.

---

## 📁 Project Structure
```text
chat-app-v2/
├── client/          # Next.js Frontend
│   └── ...
└── server/          # Node.js Backend
    ├── server.js    # Entry point
    ├── users.json   # Auth DB
    └── messages.json# Chat DB
