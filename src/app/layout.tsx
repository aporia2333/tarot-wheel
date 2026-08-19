import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "塔罗圆轮",
  description: "移动端优先的塔罗圆轮抽牌 MVP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
