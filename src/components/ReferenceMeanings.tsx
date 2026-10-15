import { getCardKnowledge, getCardMeaning, getKeywords } from "@/data/tarotCards";
import { getSpreadDefinition } from "@/data/spreads";
import type { TarotReading } from "@/types";

export function ReferenceMeanings({ reading, hasInterpretation }: { reading: TarotReading; hasInterpretation: boolean }) {
  const knownPositions = getSpreadDefinition(reading.spread.id)?.positions[reading.spread.count];
  return <section className="reference-section" aria-labelledby="reference-title">
    <h2 id="reference-title">牌义参考</h2>
    <p className="field-help">来自牌库的正逆位参考与牌位提示，供你先观察牌面；完整 AI 解读会进一步结合问题与整副牌阵。</p>
    <details open={!hasInterpretation} className="reference-details"><summary>查看这次牌面的参考牌义</summary>
      <div className="reference-list">{reading.selectedCards.map((selected, index) => {
        const position = /^第\s*\d+\s*张$/.test(selected.position) && reading.spread.id !== "custom"
          ? knownPositions?.[index] || selected.position : selected.position;
        let meaning = "这张牌的参考资料暂不完整，可以先观察牌面与它所在的位置。";
        let keywords: string[] = [];
        try { const card = getCardKnowledge(selected.card); meaning = getCardMeaning(card, selected.orientation); keywords = getKeywords(card, selected.orientation); } catch { /* Keep historical results readable. */ }
        const hint = /对方/.test(position) ? "留意互动中可观察的表现；牌面不能确认对方的真实想法。"
          : /未来|趋势|结果|个月/.test(position) ? "观察当前方向可能带来的变化，以及哪些因素仍可由你调整。"
          : /过去|根基/.test(position) ? "回想已有经历如何影响此刻，哪些模式仍在延续。"
          : /行动|建议|方向/.test(position) ? "从牌义中挑出一件你能尝试的小事，结合现实条件判断。"
          : /挑战|阻碍|障碍|代价/.test(position) ? "辨认需要面对的限制、过度投入或尚未解决的矛盾。"
          : /助力|机会|资源|优势/.test(position) ? "留意可用的支持与机会，想想怎样把它们落实。"
          : `围绕“${position}”观察你的处境，记录最有共鸣的图像或关键词。`;
        const customMeaning = reading.spread.id === "custom" && typeof reading.spread.positionMeanings?.[index] === "string" ? reading.spread.positionMeanings[index].trim() : "";
        return <article key={`${selected.card.id}-${index}`} className="reference-meaning">
          <div><p className="position">{index + 1}. {position}</p><h3><a href={`#reading-card-${index}`}>{selected.card.nameCn}</a></h3>
            <span className="orientation-label">{selected.orientation === "upright" ? "正位参考" : "逆位参考"}</span></div>
          <div><p className="reference-keywords">{keywords.join("、")}</p><p>{meaning}</p><p className="position-prompt">{customMeaning ? `牌位含义：${customMeaning}` : `牌位提示：${hint}`}</p></div>
        </article>;
      })}</div>
    </details>
  </section>;
}
