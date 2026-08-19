"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReadingFlowStore } from "@/store/readingFlowStore";

export default function QuestionPage() {
  const router = useRouter();
  const { question, contextInfo, setQuestionInfo } = useReadingFlowStore();
  const [localQuestion, setLocalQuestion] = useState(question);
  const [localContext, setLocalContext] = useState(contextInfo);

  return (
    <main className="page-shell">
      <div className="content-wrap max-w-3xl">
        <h1 className="text-3xl font-semibold text-white">输入问题</h1>
        <div className="glass mt-6 rounded-lg p-5">
          <label className="block text-sm text-mist/80" htmlFor="question">
            你的问题
          </label>
          <textarea
            id="question"
            className="field mt-2 min-h-32"
            value={localQuestion}
            onChange={(event) => setLocalQuestion(event.target.value)}
            placeholder="可以留空"
          />
          <label className="mt-5 block text-sm text-mist/80" htmlFor="contextInfo">
            补充信息
          </label>
          <textarea
            id="contextInfo"
            className="field mt-2 min-h-32"
            value={localContext}
            onChange={(event) => setLocalContext(event.target.value)}
            placeholder="可以留空"
          />
          <button
            type="button"
            className="btn-primary mt-6 w-full sm:w-auto"
            onClick={() => {
              setQuestionInfo(localQuestion.trim(), localContext.trim());
              router.push("/spreads");
            }}
          >
            下一步
          </button>
        </div>
      </div>
    </main>
  );
}
