"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReadingLayout } from "@/components/ReadingLayout";
import { PreparationScene } from "@/components/PreparationScene";
import { useDealerCharacter } from "@/components/DealerCharacterProvider";
import { GuestStartButton } from "@/components/GuestStartButton";
import { useReadingFlowStore } from "@/store/readingFlowStore";
import { readingGuides } from "@/data/readingGuides";

const remarks = [
  "今晚，你想问些什么？",
  "不急，把此刻想到的写下来就好。",
  "一个选择，一段关系，或只是想看清眼前的自己。",
  "暂时没有具体问题，也可以让牌说说此刻。",
];
const completeIdle = () => {};

export function QuestionConversation({ entrance = false }: { entrance?: boolean }) {
  const router = useRouter();
  const { character } = useDealerCharacter();
  const { question, contextInfo, setQuestionInfo, setQuestionDraft } = useReadingFlowStore();
  const [remark, setRemark] = useState(0);
  const [examplesOpen, setExamplesOpen] = useState(false);
  return <ReadingLayout immersive>
    <h1 className="ritual-sr-only">{entrance ? "星月之间" : "输入问题"}</h1>
    <section className="preparation-room conversation-room" aria-label="与占卜师交谈">
      <PreparationScene character={character} state={remark ? "talk" : "idle"} operation={null} onComplete={completeIdle}
        onDealerClick={() => setRemark((value) => (value + 1) % remarks.length)} />
      <div className="dealer-dialogue conversation-dialogue">
        <p className="dealer-name">{character.name}</p>
        <p className="conversation-line" aria-live="polite" aria-atomic="true">{remarks[remark]}</p>
        <form className="question-form" onSubmit={(event) => {
          event.preventDefault(); setQuestionInfo(question.trim(), contextInfo.trim()); router.push("/spreads");
        }}>
          <label className="ritual-sr-only" htmlFor="question">你的问题</label>
          <textarea id="question" className="field question-input" maxLength={2000} value={question}
            onChange={(event) => setQuestionDraft(event.target.value, contextInfo)} placeholder="把想问的，告诉我…" />
          <details className="conversation-context" open={contextInfo ? true : undefined}>
            <summary>补充背景</summary>
            <label className="ritual-sr-only" htmlFor="contextInfo">Context / 背景信息</label>
            <textarea id="contextInfo" className="field context-input" maxLength={5000} value={contextInfo}
              onChange={(event) => setQuestionDraft(question, event.target.value)} placeholder="还有什么想让我知道的？" />
          </details>
          <div className="conversation-actions">
            <button type="button" className="text-link" aria-expanded={examplesOpen} aria-controls="conversation-examples"
              onClick={() => setExamplesOpen((value) => !value)}>还没想好</button>
            <button type="submit" className="btn-primary" aria-label="下一步">继续</button>
          </div>
          {examplesOpen ? <div id="conversation-examples" className="conversation-examples">
            {readingGuides.map((guide) => <button key={guide.id} type="button" className="text-link"
              aria-label={`${guide.title}：${guide.question}`} onClick={() => {
                setQuestionDraft(guide.question, contextInfo); setExamplesOpen(false); document.getElementById("question")?.focus();
              }}>{guide.title}</button>)}
          </div> : null}
        </form>
        {entrance ? <div className="conversation-guest"><GuestStartButton label="访客进入" className="text-link" /></div> : null}
      </div>
    </section>
  </ReadingLayout>;
}
