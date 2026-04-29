import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// 1. Setting up the Geist Sans font (the clean, modern look)
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// 2. Setting up the Geist Mono font (the 'code' look for numbers/symbols)
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 3. This tells the browser tab what name to show
export const metadata = {
  title: "Logic's Real-Time Chat",
  description: "A chat app built from scratch",
};

// 4. The main 'Frame' of your website
export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col antialiased`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
