import type { TarotSpread } from "@/types";

export interface SpreadCountOption {
  value: number;
  label: string;
}

export interface SpreadDefinition {
  id: string;
  name: string;
  description: string;
  suitableFor: string;
  countOptions: SpreadCountOption[];
  recommendedCount: number;
  positions: Record<number, string[]>;
}

const numbers = (values: number[]): SpreadCountOption[] =>
  values.map((value) => ({ value, label: String(value) }));

const genericPositions = (count: number) =>
  Array.from({ length: count }, (_, index) => `第 ${index + 1} 张`);

const positionMap = (counts: number[], primary: string[]) =>
  Object.fromEntries(
    counts.map((count) => [
      count,
      count === primary.length ? primary : genericPositions(count),
    ]),
  );

export const spreads: SpreadDefinition[] = [
  {
    id: "general",
    name: "通用牌阵",
    description: "从不同角度梳理当下问题，获得清晰、实用的整体指引。",
    suitableFor: "日常问题与综合指引",
    countOptions: numbers([1, 3, 5, 7]),
    recommendedCount: 3,
    positions: positionMap([1, 3, 5, 7], ["过去", "现在", "未来"]),
  },
  {
    id: "relationship",
    name: "关系牌阵",
    description: "探索你与他人的关系动态，了解双方状态和未来趋势。",
    suitableFor: "感情、友情与合作关系",
    countOptions: numbers([3, 5, 7]),
    recommendedCount: 5,
    positions: positionMap([3, 5, 7], ["你的状态", "对方状态", "关系核心", "隐藏影响", "发展趋势"]),
  },
  {
    id: "decision",
    name: "决策牌阵",
    description: "比较选择背后的机会与代价，帮助你看清下一步。",
    suitableFor: "选择、取舍与行动判断",
    countOptions: numbers([2, 5, 7]),
    recommendedCount: 5,
    positions: positionMap([2, 5, 7], ["问题核心", "机会", "风险", "隐藏因素", "行动建议"]),
  },
  {
    id: "timeline",
    name: "时间牌阵",
    description: "沿时间线观察事件的起因、现状与后续发展。",
    suitableFor: "事件发展与阶段变化",
    countOptions: numbers([3, 5, 7]),
    recommendedCount: 3,
    positions: positionMap([3, 5, 7], ["过去", "现在", "未来"]),
  },
  {
    id: "career",
    name: "事业牌阵",
    description: "审视职业现状、潜在机会与需要突破的关键障碍。",
    suitableFor: "工作、职业发展与转型",
    countOptions: numbers([5, 7]),
    recommendedCount: 5,
    positions: positionMap([5, 7], ["职业现状", "优势", "挑战", "潜在机会", "行动方向"]),
  },
  {
    id: "self-discovery",
    name: "自我探索",
    description: "倾听内在真实需求，看见自己的力量、阴影与成长方向。",
    suitableFor: "内在成长与自我觉察",
    countOptions: numbers([3, 5, 7]),
    recommendedCount: 5,
    positions: positionMap([3, 5, 7], ["当下的我", "内在需求", "潜在力量", "需要放下", "成长方向"]),
  },
  {
    id: "monthly",
    name: "月度牌阵",
    description: "洞察未来一个月的主题、挑战、助力与重要提醒。",
    suitableFor: "月度规划与能量观察",
    countOptions: numbers([5, 7]),
    recommendedCount: 5,
    positions: positionMap([5, 7], ["本月主题", "事业", "关系", "挑战", "月度建议"]),
  },
  {
    id: "yearly",
    name: "年度牌阵",
    description: "纵览十二个月的能量走向，把握整年的重要主题。",
    suitableFor: "年度趋势与长期规划",
    countOptions: numbers([12, 13]),
    recommendedCount: 12,
    positions: positionMap([12, 13], genericPositions(12)),
  },
  {
    id: "yes-no",
    name: "是非牌阵",
    description: "快速查看问题的倾向，并理解影响答案的关键因素。",
    suitableFor: "答案较明确的是非问题",
    countOptions: numbers([1, 3]),
    recommendedCount: 1,
    positions: positionMap([1, 3], ["答案倾向"]),
  },
  {
    id: "celtic-cross",
    name: "凯尔特十字",
    description: "经典深度牌阵，多层次分析复杂问题的根源与走向。",
    suitableFor: "复杂问题与长期困惑",
    countOptions: numbers([6, 10]),
    recommendedCount: 10,
    positions: positionMap([6, 10], genericPositions(10)),
  },
  {
    id: "horseshoe",
    name: "马蹄铁",
    description: "用七个位置串联过去、环境、阻碍与最终结果。",
    suitableFor: "完整事件分析与趋势判断",
    countOptions: numbers([7]),
    recommendedCount: 7,
    positions: positionMap([7], ["过去", "现在", "未来", "应对方式", "外部影响", "阻碍", "结果"]),
  },
  {
    id: "zodiac",
    name: "十二宫",
    description: "以十二个生活领域为轴，展开全面而细致的人生观察。",
    suitableFor: "生活全景与长期主题",
    countOptions: numbers([12]),
    recommendedCount: 12,
    positions: positionMap([12], genericPositions(12)),
  },
  {
    id: "weekly",
    name: "每周指引",
    description: "预览一周的节奏、关键机会和最值得留意的提醒。",
    suitableFor: "一周规划与每日提醒",
    countOptions: numbers([5, 7]),
    recommendedCount: 7,
    positions: positionMap([5, 7], genericPositions(7)),
  },
  {
    id: "goal",
    name: "目标实现",
    description: "拆解目标、资源与障碍，找到更有把握的实现路径。",
    suitableFor: "目标规划与行动推进",
    countOptions: numbers([5, 7]),
    recommendedCount: 5,
    positions: positionMap([5, 7], ["目标核心", "已有资源", "主要障碍", "关键行动", "结果趋势"]),
  },
  {
    id: "choice",
    name: "二选一",
    description: "并列观察两个选项的能量、代价与可能结果。",
    suitableFor: "两个方案之间的比较",
    countOptions: numbers([5, 7]),
    recommendedCount: 5,
    positions: positionMap([5, 7], ["当前状态", "选项 A", "A 的结果", "选项 B", "B 的结果"]),
  },
  {
    id: "custom",
    name: "自定义牌阵",
    description: "保留开放的解读空间，用你自己的方式定义牌位与主题。",
    suitableFor: "熟悉塔罗并希望自由探索",
    countOptions: [{ value: 3, label: "Custom" }],
    recommendedCount: 3,
    positions: { 3: genericPositions(3) },
  },
];

export function toTarotSpread(
  definition: SpreadDefinition,
  count = definition.recommendedCount,
): TarotSpread {
  return {
    id: definition.id,
    name: definition.name,
    count,
    description: definition.description,
    suitableFor: definition.suitableFor,
    positions: definition.positions[count] ?? genericPositions(count),
  };
}
