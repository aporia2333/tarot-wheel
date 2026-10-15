import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { evaluationCases, evaluationReading, qualityRubric } from "../src/lib/ai/evaluationCases";
import { formatReading, TAROT_SYSTEM_PROMPT } from "../src/lib/ai/tarotInterpretation";
import { generateDeepSeekInterpretation } from "../src/lib/ai/deepseek";

async function main() {
  const args = process.argv.slice(2);
  const live = args.includes("--live");
  const requested = args.find((arg) => arg.startsWith("--case="))?.slice(7);
  const cases = requested ? evaluationCases.filter((item) => item.id === requested) : evaluationCases;
  if (!cases.length) throw new Error("评估案例不存在。");
  if (live) {
    const require = createRequire(import.meta.url);
    require("@next/env").loadEnvConfig(process.cwd());
    if (!process.env.DEEPSEEK_API_KEY) throw new Error("未配置 DEEPSEEK_API_KEY；未发起付费请求。");
  }
  const output = resolve(args.find((arg) => arg.startsWith("--output="))?.slice(9) ||
    join(".audit", "ai-quality", new Date().toISOString().replace(/[:.]/g, "-")));
  await mkdir(output, { recursive: true });
  const results: Array<Record<string, unknown>> = [];
  for (const item of cases) {
    const reading = evaluationReading(item);
    const result: Record<string, unknown> = { id: item.id, title: item.title, focus: item.focus, reading,
      input: formatReading(reading), status: live ? "running" : "not_run", humanScores: Object.fromEntries(qualityRubric.map((rubric) => [rubric.id, null])) };
    if (live) {
      try { result.interpretation = await generateDeepSeekInterpretation(reading); result.status = "structure_passed"; }
      catch (error) { result.status = "failed"; result.error = error instanceof Error ? error.message : "生成失败。"; }
    }
    results.push(result);
    await writeFile(join(output, "results.json"), JSON.stringify({ live, model: live ? process.env.DEEPSEEK_MODEL || "deepseek-v4-flash" : null,
      systemPrompt: TAROT_SYSTEM_PROMPT, rubric: qualityRubric, results }, null, 2));
    console.log(`${item.id}: ${result.status}`);
  }
  const rows = results.map((item) => `| ${item.id} | ${item.title} | ${item.status} | — | — | — | — | — |`).join("\n");
  await writeFile(join(output, "REVIEW.md"), `# 解读质量评估\n\n${live ? "已调用真实服务。结构通过并不等于内容质量通过。" : "本次仅导出固定输入，没有调用 AI，没有产生费用。"}\n\n` +
    "逐条阅读 results.json 中的输出，按下面的 1–5 分标准填写评分，并记录具体牌位证据。不要只凭结构检查给内容打分。\n\n" +
    qualityRubric.map((item) => `- **${item.title}**：${item.anchors}`).join("\n") +
    "\n\n任一事实错位、虚构重抽或绝对判决都应单独记录为严重问题；建议每项至少 4 分且没有严重问题再接受该版本。\n\n" +
    "| 案例 | 标题 | 结构状态 | 情境 | 牌位 | 综合 | 行动 | 可读性 |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n" + rows + "\n");
  console.log(`评估资料：${output}`);
  if (live && results.some((item) => item.status === "failed")) process.exitCode = 1;
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "评估失败。"); process.exitCode = 1; });
