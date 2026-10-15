import type { TarotSpread } from "@/types";
export const MAX_CUSTOM_CARDS = 13;

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
const customCounts = Array.from({ length: MAX_CUSTOM_CARDS }, (_, index) => index + 1);

const months = Array.from({ length: 12 }, (_, index) => `第 ${index + 1} 个月`);
const week = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const celtic = ["现状", "交叉／挑战", "根基", "近期过去", "目标与最佳可能", "近期未来", "自我态度", "外部影响", "希望与恐惧", "结果趋势"];

export const spreads: SpreadDefinition[] = [
  {
    id: "general",
    name: "通用牌阵",
    description: "从不同角度梳理当下问题，获得清晰、实用的整体指引。",
    suitableFor: "日常问题与综合指引",
    countOptions: numbers([1, 3, 5, 7]),
    recommendedCount: 3,
    positions: {
      1: ["当下主题与指引"],
      3: ["过去", "现在", "未来趋势"],
      5: ["问题核心", "已有助力", "主要阻碍", "行动建议", "结果趋势"],
      7: ["过去", "现在", "隐藏因素", "主要阻碍", "已有助力", "行动建议", "结果趋势"],
    },
  },
  {
    id: "relationship",
    name: "关系牌阵",
    description: "探索你与他人的关系动态，了解双方状态和未来趋势。",
    suitableFor: "感情、友情与合作关系",
    countOptions: numbers([3, 5, 7]),
    recommendedCount: 5,
    positions: {
      3: ["你的状态", "对方状态", "关系趋势"],
      5: ["你的状态", "对方状态", "关系核心", "隐藏影响", "发展趋势"],
      7: ["你的状态", "对方状态", "关系核心", "双方需求", "隐藏影响", "相处建议", "发展趋势"],
    },
  },
  {
    id: "decision",
    name: "决策牌阵",
    description: "比较选择背后的机会与代价，帮助你看清下一步。",
    suitableFor: "选择、取舍与行动判断",
    countOptions: numbers([2, 5, 7]),
    recommendedCount: 5,
    positions: {
      2: ["机会与收益", "风险与代价"],
      5: ["问题核心", "机会", "风险", "隐藏因素", "行动建议"],
      7: ["问题核心", "决策动机", "机会", "风险", "隐藏因素", "行动建议", "结果趋势"],
    },
  },
  {
    id: "timeline",
    name: "时间牌阵",
    description: "沿时间线观察事件的起因、现状与后续发展。",
    suitableFor: "事件发展与阶段变化",
    countOptions: numbers([3, 5, 7]),
    recommendedCount: 3,
    positions: {
      3: ["过去", "现在", "未来趋势"],
      5: ["较早过去", "近期过去", "现在", "近期未来趋势", "较远未来趋势"],
      7: ["事件起因", "过去发展", "近期过去", "现在", "下一阶段", "后续发展", "长期趋势"],
    },
  },
  {
    id: "career",
    name: "事业牌阵",
    description: "审视职业现状、潜在机会与需要突破的关键障碍。",
    suitableFor: "工作、职业发展与转型",
    countOptions: numbers([5, 7]),
    recommendedCount: 5,
    positions: {
      5: ["职业现状", "优势", "挑战", "潜在机会", "行动方向"],
      7: ["职业现状", "个人优势", "主要挑战", "外部环境", "潜在机会", "行动方向", "发展趋势"],
    },
  },
  {
    id: "self-discovery",
    name: "自我探索",
    description: "倾听内在真实需求，看见自己的力量、阴影与成长方向。",
    suitableFor: "内在成长与自我觉察",
    countOptions: numbers([3, 5, 7]),
    recommendedCount: 5,
    positions: {
      3: ["当下的我", "内在需求", "成长方向"],
      5: ["当下的我", "内在需求", "潜在力量", "需要放下", "成长方向"],
      7: ["当下的我", "内在需求", "潜在力量", "盲点", "需要放下", "支持资源", "成长方向"],
    },
  },
  {
    id: "monthly",
    name: "月度牌阵",
    description: "洞察未来一个月的主题、挑战、助力与重要提醒。",
    suitableFor: "月度规划与能量观察",
    countOptions: numbers([5, 7]),
    recommendedCount: 5,
    positions: {
      5: ["本月主题", "事业", "关系", "挑战", "月度建议"],
      7: ["本月主题", "事业", "关系", "资源与财务", "挑战", "助力", "月度建议"],
    },
  },
  {
    id: "yearly",
    name: "年度牌阵",
    description: "纵览十二个月的能量走向，把握整年的重要主题。",
    suitableFor: "年度趋势与长期规划",
    countOptions: numbers([12, 13]),
    recommendedCount: 12,
    positions: { 12: months, 13: ["年度主题", ...months] },
  },
  {
    id: "yes-no",
    name: "是非牌阵",
    description: "快速查看问题的倾向，并理解影响答案的关键因素。",
    suitableFor: "答案较明确的是非问题",
    countOptions: numbers([1, 3]),
    recommendedCount: 1,
    positions: { 1: ["答案倾向"], 3: ["支持因素", "阻碍因素", "答案倾向与建议"] },
  },
  {
    id: "celtic-cross",
    name: "凯尔特十字",
    description: "经典深度牌阵，多层次分析复杂问题的根源与走向。",
    suitableFor: "复杂问题与长期困惑",
    countOptions: numbers([6, 10]),
    recommendedCount: 10,
    positions: { 6: celtic.slice(0, 6), 10: celtic },
  },
  {
    id: "horseshoe",
    name: "马蹄铁",
    description: "用七个位置串联过去、环境、阻碍与最终结果。",
    suitableFor: "完整事件分析与趋势判断",
    countOptions: numbers([7]),
    recommendedCount: 7,
    positions: { 7: ["过去", "现在", "未来趋势", "应对方式", "外部影响", "阻碍", "结果趋势"] },
  },
  {
    id: "zodiac",
    name: "十二宫",
    description: "以十二个生活领域为轴，展开全面而细致的人生观察。",
    suitableFor: "生活全景与长期主题",
    countOptions: numbers([12]),
    recommendedCount: 12,
    positions: { 12: ["第一宫：自我与表达", "第二宫：资源与价值", "第三宫：沟通与学习", "第四宫：家庭与根基", "第五宫：创造与恋爱", "第六宫：日常与照顾自己", "第七宫：伴侣与合作", "第八宫：共享资源与转化", "第九宫：探索与信念", "第十宫：事业与公共角色", "第十一宫：社群与愿景", "第十二宫：内在与休整"] },
  },
  {
    id: "weekly",
    name: "每周指引",
    description: "预览一周的节奏、关键机会和最值得留意的提醒。",
    suitableFor: "一周规划与每日提醒",
    countOptions: numbers([5, 7]),
    recommendedCount: 7,
    positions: { 5: ["本周主题", "关键机会", "主要挑战", "可用助力", "行动提醒"], 7: week },
  },
  {
    id: "goal",
    name: "目标实现",
    description: "拆解目标、资源与障碍，找到更有把握的实现路径。",
    suitableFor: "目标规划与行动推进",
    countOptions: numbers([5, 7]),
    recommendedCount: 5,
    positions: {
      5: ["目标核心", "已有资源", "主要障碍", "关键行动", "结果趋势"],
      7: ["目标核心", "当前进度", "已有资源", "主要障碍", "外部助力", "关键行动", "结果趋势"],
    },
  },
  {
    id: "choice",
    name: "二选一",
    description: "并列观察两个选项的能量、代价与可能结果。",
    suitableFor: "两个方案之间的比较",
    countOptions: numbers([5, 7]),
    recommendedCount: 5,
    positions: {
      5: ["当前状态", "选项 A", "A 的结果趋势", "选项 B", "B 的结果趋势"],
      7: ["当前状态", "A 的机会", "A 的代价", "A 的结果趋势", "B 的机会", "B 的代价", "B 的结果趋势"],
    },
  },
  {
    id: "custom",
    name: "自定义牌阵",
    description: "设置 1～13 张牌，为每个牌位命名、补充含义，并保存为自己的常用模板。",
    suitableFor: "熟悉塔罗并希望自由探索",
    countOptions: numbers(customCounts),
    recommendedCount: 3,
    positions: Object.fromEntries(customCounts.map((count) => [count, genericPositions(count)])),
  },
];

export function toTarotSpread(
  definition: SpreadDefinition,
  count = definition.recommendedCount,
): TarotSpread {
  if (!definition.countOptions.some((option) => option.value === count) || definition.positions[count]?.length !== count) {
    throw new Error("牌阵不支持这个抽牌数量。");
  }
  return {
    id: definition.id,
    name: definition.id === "celtic-cross" && count === 6 ? `${definition.name}（六牌简版）` : definition.name,
    count,
    description: definition.id === "celtic-cross" && count === 6
      ? "凯尔特十字的六牌简版，观察中心六个牌位；不包含十字牌阵的四张杖牌。"
      : definition.description,
    suitableFor: definition.suitableFor,
    positions: [...definition.positions[count]],
  };
}

export function getSpreadDefinition(id: string): SpreadDefinition | undefined {
  return spreads.find((spread) => spread.id === id);
}
