# R05 / R05.1 实现记录

日期：2026-10-10。依据 R05 的交互和角色系统、R05.1 的最新视觉，以及已经确认的 R01–R04 业务规则。本轮在可行性审查与概念图获认可后实施，没有新增 npm 依赖。

## 实现

- 准备页全幅深绿房间、暖烛光与冷月光、透明绒布木桌、四位分层塔罗师；使用小幅呼吸、眨眼和落牌时短暂聚拢微粒。
- 两段次数邀请默认只出现“我来决定 / 交给你”；选择手动后展开 1–10 控件。交给塔罗师只随机决定一次，再按计划执行。
- 塔罗师选项放在收起的浮层中，支持键盘焦点与 Esc 返回；洗切进行时锁定切换。图片失败时保留流程，减少动态效果时关闭装饰动画。
- 四种洗牌和三种切牌继续使用同一操作计划。独立上臂、前臂与三种手势跟随计划中的牌包，演出完成后原子提交同一牌序与方向。
- 猫形依据最新反馈重绘为自然猫脸、完整猫耳、胡须、毛绒短爪与托牌肉垫。头身和袖子的裁切按素材校准。
- 保留随机洗牌 2–4 次、随机切牌 1–3 次、手动 1–10 次，切牌完成后自动进入抽牌；后续抽牌、摆牌、重抽、翻牌与保存行为沿用原实现。

## 文件范围

| 范围 | 文件 |
| --- | --- |
| 准备页与视觉 | `src/app/shuffle/page.tsx`、`preparation.css` |
| 分层舞台与角色浮层 | `src/components/PreparationScene.tsx`、`preparation/ReaderSwitcher.tsx` |
| 当前页导航与布局 | `src/components/SiteHeader.tsx`、`ReadingLayout.tsx` |
| 角色定义与素材 | `src/data/dealerCharacters.ts`、四个角色 manifest 和图集、`public/scenes/preparation/` |
| 演出与可选日志 | `src/lib/preparationMotion.ts`、`preparation.ts`、`src/store/readingFlowStore.ts` |
| 验证与文档 | 准备页、动作和原流程测试及助手；本目录素材、提示词与准备流程说明 |

`countSource` 与两段方法日志为可选字段，存储 version 保持 3，旧有效操作计划继续恢复。新的演出速度和桌面纵深投影不改变保存计划中的 `durationMs`、轨迹、随机选择或牌包集合。

## 资源与提示词

人形 `star-moon/atlas-v2.png`、`scholar/atlas-v2.png`；猫形 `quqi/atlas-v3.png`、`star-cap/atlas-v3.png`；房间 `room-v1.png` 与透明桌面 `table-v1.png`。原 v1 素材保留。

生成方式为 **Codex 内置 imagegen**。生产提示词：`output/design/r05-production-prompts.json`；最终猫形及桌面提示词：`output/design/r05-feline-refinement-prompts.json`。详细格位和当前锚点见 `DEALER_ASSETS.md`。

## 验证

本轮 53 项单元测试通过，类型检查与生产构建通过。50 个不同的本地浏览器场景分批通过，其中新增的两个场景分别在桌面与触屏项目验证 1440×900、1280×720、768×1024、390×844 的遮挡、边界、横向溢出和键盘选项。七种动作核对落牌后的全部 78 张牌序及基础正逆位，并覆盖刷新、旧会话、重复启动、皮肤、素材失败、随机范围、减少动态效果及后续阅读流程。

本轮没有重跑模拟云端场景，未使用真实云端账户或付费 AI。此前 R01–R04 的模拟云端记录见 `TAROT_PREPARATION.md`。

实际页面截图保存在 `output/playwright/r05-ritual-<width>x<height>.png`；最终猫形页面为 `r05-quqi-final.png`、`r05-star-cap-final.png`。它们是运行中的页面截图，概念图另在 `output/design/r05-immersive-preparation-concept-v1.png`。

## 当前限制

当前采用 SVG 分层骨骼和关键手势，尚未制作独立口型、猫耳骨骼和逐指动作。袖子接缝与少量表情颈部边缘可继续手工精修。房间与桌面合计约 4.3 MB，每个图集约 2–2.7 MB；关闭的角色选项不会预加载其他角色图集。没有启用音效或额外生图服务。
