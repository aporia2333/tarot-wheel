"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CutAnimation } from "@/components/CutAnimation";
import { cutDeck } from "@/lib/shuffle";
import { useReadingFlowStore } from "@/store/readingFlowStore";

const text = {
  title: "\u5207\u724c",
  description:
    "\u5207\u724c\u4f1a\u4fdd\u7559\u5f53\u524d\u6d17\u597d\u7684\u724c\u5e8f\uff0c\u53ea\u4ece\u968f\u673a\u4f4d\u7f6e\u628a\u724c\u7ec4\u524d\u540e\u5bf9\u8c03\u3002\u4f60\u53ef\u4ee5\u591a\u6b21\u5207\u724c\uff0c\u786e\u8ba4\u540e\u518d\u8fdb\u5165\u62bd\u724c\u3002",
  countPrefix: "\u5f53\u524d\u5df2\u5207\u724c",
  countSuffix: "\u6b21",
  cutting: "\u5207\u724c\u4e2d...",
  cutAgain: "\u518d\u5207\u4e00\u6b21",
  randomCut: "\u968f\u673a\u5207\u724c",
  confirm: "\u786e\u8ba4\u5207\u724c",
  skip: "\u8df3\u8fc7\u5207\u724c",
};

export default function CutPage() {
  const router = useRouter();
  const { shuffledDeck, setShuffledDeck } = useReadingFlowStore();
  const [cutCount, setCutCount] = useState(0);
  const [cutting, setCutting] = useState(false);

  function randomCut() {
    if (cutting || !shuffledDeck.length) return;

    setCutting(true);
    const index = Math.floor(Math.random() * shuffledDeck.length);
    const nextDeck = cutDeck(shuffledDeck, index);

    setTimeout(() => {
      setShuffledDeck(nextDeck);
      setCutCount((count) => count + 1);
      setCutting(false);
    }, 900);
  }

  return (
    <main className="page-shell">
      <div className="content-wrap max-w-2xl">
        <h1 className="text-3xl font-semibold text-white">{text.title}</h1>
        <section className="glass mt-6 rounded-lg p-5 text-center">
          <p className="leading-7 text-mist/78">{text.description}</p>

          <CutAnimation active={cutting} cutCount={cutCount} />

          <div className="mt-5 rounded-lg border border-white/12 bg-white/[0.06] p-4 text-sm text-mist/78">
            {text.countPrefix} {cutCount} {text.countSuffix}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn-secondary" onClick={randomCut} disabled={!shuffledDeck.length || cutting}>
              {cutting ? text.cutting : cutCount ? text.cutAgain : text.randomCut}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => router.push("/draw")}
              disabled={!shuffledDeck.length || cutting}
            >
              {text.confirm}
            </button>
            <button type="button" className="btn-secondary" onClick={() => router.push("/draw")} disabled={cutting}>
              {text.skip}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
