export const readingGuides = [
  { id: "present", title: "看清当下", description: "用一张牌聚焦此刻最值得留意的方向。", spreadId: "general", count: 1,
    question: "当下我最需要留意什么？" },
  { id: "relationship", title: "理解关系", description: "观察双方状态与关系中的互动趋势。", spreadId: "relationship", count: 3,
    question: "面对这段关系，我需要理解什么，又能怎样沟通？" },
  { id: "choice", title: "比较选择", description: "并列观察两个选项及其可能的发展。", spreadId: "choice", count: 5,
    question: "面对两个选择，我需要分别考虑哪些机会与代价？" },
] as const;

export function suggestedGuide(question: string) {
  if (/选择|方案|取舍|二选|还是/.test(question)) return "choice";
  if (/关系|恋|伴侣|朋友|合作|对方|沟通/.test(question)) return "relationship";
  return "present";
}
