import type { Metadata } from "next";
import "./globals.css";
import "./room-pages.css";
import "./shuffle/preparation.css";
import "./ritual-reading.css";
import "./spread-book.css";
import { ReadingFlowHydration } from "@/components/ReadingFlowHydration";
import { SiteHeader } from "@/components/SiteHeader";
import { CardSkinProvider } from "@/components/CardSkinProvider";
import { DealerCharacterProvider } from "@/components/DealerCharacterProvider";

export const metadata: Metadata = {
  title: "星月之间",
  description: "一间安静的塔罗牌室，从一个问题开始，让牌面与此刻的心意相遇。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body><CardSkinProvider><DealerCharacterProvider><SiteHeader /><ReadingFlowHydration>{children}</ReadingFlowHydration></DealerCharacterProvider></CardSkinProvider></body>
    </html>
  );
}
