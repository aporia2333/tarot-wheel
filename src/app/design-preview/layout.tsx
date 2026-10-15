import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "星月之间 · 第一轮设计示意",
  robots: { index: false, follow: false },
};

export default function DesignPreviewLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<main id="main-content" className="page-shell" aria-busy="true" />}>{children}</Suspense>;
}
