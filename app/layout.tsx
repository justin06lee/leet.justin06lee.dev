import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Navbar from "@/components/Navbar";
import { Palette } from "@/components/Palette";
import { DialogProvider } from "@/components/chrome/dialog";
import "./globals.css";

export const metadata: Metadata = {
  title: "leet — leetcode mastery",
  description: "a tiered, spaced-repetition course for mastering coding-interview patterns.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full bg-black antialiased`}
    >
      <body className="flex min-h-full flex-col bg-black text-white">
        <DialogProvider>
          <Navbar />
          <Palette />
          <main className="flex-1 pt-14">{children}</main>
        </DialogProvider>
      </body>
    </html>
  );
}
