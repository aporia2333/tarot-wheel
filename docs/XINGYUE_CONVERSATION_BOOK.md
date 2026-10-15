# 星月之间：开场对话、牌阵书与连贯角色

最新水晶控牌和角色动作记录见 [水晶控牌实施报告](XINGYUE_CRYSTAL_RITUAL_V5.md)；继续保留自动切牌一次及本页牌阵书规则。

2026-10-11。按本轮确认，先完成正式开场与牌阵书，随后接入用户选择的“重做连贯头颈与上半身”方案。

最新角色整套重制与素材路径见 [成人比例重制记录](XINGYUE_ADULT_CHARACTER_REBUILD.md)；本文件的 portrait-v1 与早期比例校准保留为过程记录。

## 实际行为

- 首页直接进入房间，由当前占卜师问“今晚，你想问些什么？”；/question 使用同一对话组件。
- 问题、可展开的背景、按需出现的示例与继续操作都在同一个对话框内。两个字段仍可留空，沿用原草稿与提交逻辑。
- 点击人物或对人物按 Enter / 空格切换台词；不改问题、牌阵或牌组。
- /spreads 复用同一房间，书从占卜师方向靠近、封面打开。原 16 个牌阵分两组，每组 8 个，左右书页各展示 4 个。
- 翻页有纸张转动、背面及投影。书打开和翻页期间禁用书内操作；防止快速连续点击重复跳页。选定牌阵后才展开它的说明和数量控件。
- 自定义 1–13 张、牌位名称与含义、排序、草稿和模板仍在书中可用。
- 洗牌、自动魔法切一次、上下抽取、自由摆放、全部重抽、一起翻牌、结果、历史、访客与 AI 权限沿用原实现。

## 动画与状态

开书为 300ms 靠近 + 380ms 封面展开；翻页 320ms。只新增组件内的 opening / open / turning 展示状态，不写入 readingFlowStore，不重新抽样牌序或正逆位。减少动态效果时省略空间旋转，40ms 后完成展示切换。卸载会清理计时器。

人物点击区域独立于呼吸动画图层，便于鼠标、触屏和键盘稳定操作。角色眨眼用羽化的眼部遮罩覆盖闭眼素材，原躯干保持不变。点头在连贯上半身上做轻微整体转动。

## 文件与素材

- src/components/QuestionConversation.tsx：首页与问题页的共用对话。
- src/components/SpreadBook.tsx：封面、递书、翻页与操作锁。
- src/app/ritual-reading.css：对话和书的视觉、响应式与减少动态效果。
- src/app/spreads/page.tsx、SpreadCard.tsx、Pagination.tsx：复用原牌阵与编辑逻辑接入书。
- PreparationScene.tsx、preparation/DealerPortrait.tsx：可点击人物与连贯角色渲染，手臂仍用 DealerArm。
- public/characters/*/manifest.json：分别校准上半身、眼部裁切与肩部锚点。
- 原 atlas-v2 / atlas-v3 素材保留供袖子、手与旧素材回退使用。

四份最终项目素材均由内置 image_gen 工具生成，输出 alpha 原样复制，未重绘或修改旧图：

| 角色 | 最终文件 | 原参考 |
| --- | --- | --- |
| 星月 | public/characters/star-moon/portrait-v1.png | star-moon/atlas-v2.png |
| 学者 | public/characters/scholar/portrait-v1.png | scholar/atlas-v2.png |
| 曲奇猫 | public/characters/quqi/portrait-v1.png | quqi/atlas-v3.png |
| 星帽猫 | public/characters/star-cap/portrait-v1.png | star-cap/atlas-v3.png |

每份图 1254 × 1254，约 2.6–2.9 MiB；只加载当前选择角色的连贯素材。生成的行间留白略有差异，manifest 按各图实际像素校准；同一角色所有表情保持相同裁切尺寸与显示比例。猫保留耳朵、短吻、胡须、胸毛、毛茸茸的爪子和肉垫。

新连贯素材加载失败时，显示原分层角色并保留交互；原手部图也加载失败时，继续用基础图形完成动作。系统仍为二维分层绘制，袖子的侧面动作继续由现有骨骼与手背/侧面/手掌过渡完成。

## 最终提示词记录

执行工具：内置 image_gen.imagegen；所有请求 transparent_background=true、referenced_image_paths 指向上表原参考素材。

### 星月

Use case: identity-preserve. Asset type: production transparent expression atlas for a 2D tarot dealer. Reference image 1 is the existing Star Moon character and wardrobe; use its face, hair, crescent hair ornament, star earrings, ivory lace collar, dark forest-green velvet and restrained antique-gold trim as identity references. REBUILD the separated head and torso into one continuous anatomically coherent half-body bust. Output ONE genuinely transparent square PNG sprite sheet, exactly THREE equal columns and TWO equal rows, six equally sized portrait cells. Reading order: neutral attentive; slight warm closed-mouth smile; concentrated eyes looking slightly down; gently closed eyes; thoughtful eyes looking slightly aside; duplicate neutral. Every cell depicts the SAME complete connected crown-to-waist torso including head, neck, collar, shoulders, bodice. Absolutely identical camera, body silhouette, torso, costume, head scale and alignment in all cells; only eyelids and mouth change. Face, neck, ivory collar and shoulders must join naturally in one continuous painting, no cut-out head seams. Adult graceful portrait with fine cinematic painterly realism, matching the reference, natural proportions, no chibi, no plastic skin. Straight frontal shoulders, no tilted head. Each portrait centered within its cell with comfortable transparent margins, crown at 5 percent cell height, chin at 42 percent, shoulders at 58 percent, waist ending at 96 percent. Keep shoulder caps and chest only: crop the arms at their upper shoulder seams so separately rigged sleeves can attach; NO forearms, NO hands, NO duplicate arms, NO props. No table, room, text, labels, borders, checkerboard, glow, halo or background. Soft warm candle side light from left, gentle cool moon fill from right; same lighting and materials in all six frames. Rendering must retain an opaque face and costume with real transparent alpha only outside the subject.

### 学者、曲奇猫、星帽猫共用主体

Use case: identity-preserve. Asset type: a production transparent expression atlas for a 2D tarot dealer. Reference image 1 supplies the character identity, fur or face, hairstyle or hat, and exact emerald velvet and antique-gold wardrobe. Rebuild separated head and torso into ONE continuous anatomically coherent frontal bust. Output ONE genuinely transparent square PNG sheet, exactly THREE columns and TWO equal rows of equal-sized portrait cells. Reading order: neutral attentive; subtle closed-mouth smile; focused downward gaze; eyes gently closed; thoughtful gaze slightly aside; duplicate neutral. Same complete connected head-neck-shoulders-bodice crown-to-waist bust in every cell. IDENTICAL pose, head location, scale, torso outline, clothing details and lighting across all cells; ONLY eyes/mouth expressions change. Every portrait must stay ENTIRELY inside its equal cell with 8% transparent top and bottom padding and 5% side margins; do not spill into the next row; no cropped head, ears, hat or waist. Neck, collar or chest fur and shoulders blend naturally with no separate-head seam. Torso only and shoulder caps: end the arms cleanly at their upper shoulder seams, so separately rigged sleeves attach. No forearms or hands, no table, no props. High quality natural cinematic painterly realism, fine fabric and fur, soft warm candle light from left and cool moon fill from right. Restrained mature mysterious feeling, no chibi, cartoon, baby proportions, glow, halo, text, labels, grid lines, checkerboard or background. Genuine outside transparency, opaque subject.

### scholar 的附加指令

Character-specific requirements: An adult young male scholar with warm chestnut wavy hair, amber-brown eyes, ivory ruffled collar, dark embroidered waistcoat and emerald velvet robe with gold vines. Preserve the reference identity; natural adult head-to-body proportion.

### quqi 的附加指令

Character-specific requirements: A real recognizable orange-and-white fluffy CAT with amber eyes, triangular ears, short feline muzzle, tiny pink nose, long whiskers, white furry neck and chest flowing naturally from face into the robe. No human face, no human neck or skin, no humanlike smile. Emerald robe, star and moon embroidery, crescent brooch. Keep feline proportions; the chest must be furry and continuous under the head.

### star-cap 的附加指令

Character-specific requirements: A real recognizable blue-grey fluffy CAT with pale blue eyes, short feline muzzle, triangular furry ears, tiny pink nose, whiskers, furry neck and chest continuously connected with face. Preserve navy velvet pointed witch hat, crescent moon pin, star charms, emerald robe with fine gold embroidery. Do not show human neck, human skin or human mouth. No exaggerated cartoon head or baby proportions.

## 验证记录

- 58 项单元测试通过；类型检查与生产构建通过。构建仍有 design-preview 原有的三处原生 img 提示。
- 桌面与手机共 56 项不同的本地浏览器用例通过：开场草稿、人物台词、开书与翻页操作锁、自定义牌阵、上下抽卡、自由摆放、结果保存及四角色素材与加载回退。
- 14 项模拟云端用例通过：访客、账号、历史与保存、AI 权限及追问并发。修正测试服务中异步响应复用全局输入的问题；正式 AI 接口未改动。没有调用付费 AI 或真实云端账号。
- 洗切动画验证保存的操作计划、真实牌序与基础正逆位同步；牌阵书只改变展示状态。
- 浏览器实际截图：output/design/xingyue-conversation-current.png、output/design/xingyue-spread-book-current.png；桌面/手机和四位角色的回归截图同在 output/design。

## 手臂与手掌比例校准

2026-10-11：针对人物与手掌不匀称、胳膊偏干瘦的反馈，为四个角色分别配置 limbs 显示尺寸。

| 角色 | 上臂袖宽 | 前臂袖宽 | 手掌显示宽 × 高 |
| --- | --- | --- | --- |
| 星月 | 106 | 94 | 64 × 68 |
| 学者 | 112 | 100 | 68 × 70 |
| 曲奇猫 | 108 | 98 | 68 × 68 |
| 星帽猫 | 112 | 100 | 70 × 68 |

尺寸为 SVG 场景坐标。原来所有角色袖宽 78、手掌 76 × 74。上臂裁切保留更多原图的蓬松布料，按角色分别避开旧袖口；扩大袖子遮罩、减少肩肘端过长的透明渐隐，使袖管更饱满。所有手掌状态、侧转和历史自然洗牌的前景手掌统一使用角色尺寸，回退图形同步调整。

真实腕部位置、135/105 骨长、抬手和翻掌节奏均保持原值；不更改牌序、操作计划或随机状态。没有新增或修改位图素材。

验证：类型检查、生产构建、58 项单元测试及 10 项桌面/手机浏览器回归通过，涵盖四个角色眨眼、素材失败回退、真实时间洗切与刷新续播、基础正逆位、自动切一次、减少动态效果。实际截图 output/design/xingyue-proportions-star-moon-v2.png、xingyue-proportions-human-motion-v2.png；其他角色及手机版截图在同目录。
