import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";
import { GuestStartButton } from "@/components/GuestStartButton";

export default function HomePage() {
  return (
    <main className="page-shell">
      <div className="content-wrap flex justify-end pt-5"><AccountMenu /></div>
      <div className="content-wrap flex min-h-[calc(100vh-96px)] items-center"><section className="w-full py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-ember">Tarot Wheel</p>
        <h1 className="mt-5 text-5xl font-bold text-white md:text-7xl">塔罗圆轮</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-mist/78">输入你的问题，选择合适的牌阵，经过洗牌与切牌后，从圆轮中抽取属于本次阅读的牌。</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link href="/question" className="btn-primary">开始抽牌</Link>
          <Link href="/history" className="btn-secondary">历史记录</Link>
          <GuestStartButton />
        </div>
      </section></div>
    </main>
  );
}
