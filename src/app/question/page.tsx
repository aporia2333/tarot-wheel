"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReadingFlowStore } from "@/store/readingFlowStore";

export default function QuestionPage() {
  const router = useRouter();
  const { question, contextInfo, setQuestionInfo } = useReadingFlowStore();
  const [localQuestion, setLocalQuestion] = useState(question);
  const [localContext, setLocalContext] = useState(contextInfo);

  return <main className="page-shell"><div className="content-wrap max-w-3xl">
    <h1 className="text-3xl font-semibold text-white">输入问题</h1>
    <div className="glass mt-6 rounded-lg p-5">
      <label className="block text-sm text-mist/80" htmlFor="question">你的问题</label>
      <textarea id="question" className="field mt-2 min-h-32" value={localQuestion} onChange={(event) => setLocalQuestion(event.target.value)} placeholder="例如：我该如何看待目前的职业选择？" />
      <label className="mt-5 block text-sm text-mist/80" htmlFor="contextInfo">Context / 背景信息</label>
      <p className="mt-1 text-xs leading-5 text-mist/60">可选。提供与你问题有关的现状、时间范围或困惑，AI 解读会结合这些背景。</p>
      <textarea id="contextInfo" className="field mt-2 min-h-32" value={localContext} onChange={(event) => setLocalContext(event.target.value)} placeholder="例如：我目前在职三年，正在考虑是否转行。" />
      <button type="button" className="btn-primary mt-6 w-full sm:w-auto" onClick={() => { setQuestionInfo(localQuestion.trim(), localContext.trim()); router.push("/spreads"); }}>下一步</button>
    </div>
  </div></main>;
}
