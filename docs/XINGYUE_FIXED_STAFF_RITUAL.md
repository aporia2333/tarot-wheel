# 星月之间 · 固定握杖施法版本

后续已增加 [法杖释放与人物施法表演](XINGYUE_STAFF_PERFORMANCE.md)：四位角色支持凝神、收手、专注、整体握杖微倾及收势浅笑。本文记录最初固定姿态阶段，当前表现与新增素材以新报告为准。

依据用户确认的「先做固定握杖版本，后面考虑增加一点人物互动」，将正常洗切牌表演改为固定人物持杖、水晶显现能量、真实牌组运动。已接入正式应用页面，与动作预览共用组件。

## 已实现

- 四位角色都有完整的持杖上半身：头颈、躯干、双臂、袖口、握杖手或毛爪与法杖绘制在同一张透明素材中。正常仪式期间不再拆开动画手指、袖子或手腕，也不移动法杖。
- 星月使用月石与古金月弧；学者使用深木、古铜与几何水晶；曲奇猫使用琥珀色石；星帽猫使用银蓝水晶与星冠。保留原形象、暗绿衣料、古金饰纹及猫的毛爪。
- 法杖顶端先呈现微光，细光弧沿外侧肩部弯向水晶；球内增加薄雾、旋流和切牌时的双股能量，桌面有很浅的反射。没有新增大面积模糊滤镜或强闪光。
- 牌组浮空、分组交错、聚拢、连续区块切牌与叠合仍使用原动作计划。洗牌回合及洗后等待继续悬浮，切牌自动执行一次。
- 持杖人物通过前后遮挡放置在桌后。手掌/毛爪与杖尾单独用同一素材的精确矢量遮罩显示在桌前，防止衣摆覆盖桌面。遮罩由原画只读取色分析得到，不修改 PNG。
- 眨眼只合成闭眼区域，保持持杖姿态不变。开场点击角色的台词、问题输入、键盘操作与已有导航继续工作。本轮没有扩展新的互动剧情。
- 素材迟到不会重置当前牌组的位置、牌序或进度；加载过程中不显示悬空的独立手。素材失败时才加载原人物与手部绑定作为降级。旧保存计划继续兼容。
- 减少动作/低质量模式关闭杖尖光弧和桌面反射，保留固定形象及原减少动作流程；正常手机也使用同一套固定形象。

## 素材与技术

使用内置 `image_gen.imagegen`，以现有 `portrait-v2.png` 为身份和画风参考生成四套透明 RGBA 素材，每套含睁眼/闭眼两幅。工具原始 PNG 原样复制到项目，原人物、肢体和手指素材保留。

| 角色 | 项目最终素材 | SHA-256 |
|---|---|---|
| 星月 | `public/characters/star-moon/staff-v1.png` | `d79549e69e32aaf9b9b46f367018eea1a321f844d6602798483299d7a1b72998` |
| 学者 | `public/characters/scholar/staff-v1.png` | `4f9203ede3eeef42010349dd2f450e4d3d13aef2d49fc8fbbd9cb887066b0552` |
| 曲奇猫 | `public/characters/quqi/staff-v1.png` | `2c396715a9ad3ef69c1d95968d12adfe55c757ffb8469a4bd2c9440a5f76fbbd` |
| 星帽猫 | `public/characters/star-cap/staff-v1.png` | `f5abc24824f427f543c8ac2ecd1e7d5ef0c91c79b4bb96bccc5b0bd37771570f` |

完整提示词、参考图和工具输出路径见 [素材生成记录](XINGYUE_STAFF_ASSET_PROMPTS.json)。图像尺寸为 1774×887，每套约 2MB；正常页面优先加载当前角色的持杖素材，避免同时下载旧人物/肢体图。未进行额外压缩或位图裁切。

动画用于低频仪式的状态指示与空间连续性。复用现有 SVG、RAF 和 `RITUAL_CONFIG` 时间线，逐帧更新 transform/opacity；角色姿态不随帧变化。进入人物仍采用现有 350ms 与 `--ease-out`，仪式中关闭呼吸位移。没有新增应用依赖。

## 文件范围

| 文件 | 职责 |
|---|---|
| `src/components/PreparationScene.tsx` | 持杖素材优先加载、桌前/桌后遮挡、降级及正式页面接入 |
| `src/components/preparation/StaffPortrait.tsx` | 连贯静态姿态、局部眨眼、精确前景遮罩 |
| `src/components/preparation/StaffMagic.tsx` | 杖尖、细光弧及浅反射 |
| `src/components/preparation/MagicPreparationRig.tsx` | 将同一帧能量输入传入法杖和水晶，正常路径取消独立手臂渲染 |
| `src/components/preparation/CrystalBall.tsx` | 球内薄雾、双股能量、回合间连续的旋流 |
| `src/lib/staffMagicMotion.ts` | 纯视觉能量映射与法杖位置，无随机和业务写入 |
| `src/data/dealerCharacters.ts`、四套 `manifest.json` | 持杖材质、眼部、桌面遮挡和颜色配置 |
| `src/app/shuffle/preparation.css` | 固定人物姿态 |
| `scripts/inspect_staff_atlas.py` | 只读图像校准眼部及前景矢量轮廓，写入 manifest |
| `tests/staff-magic.test.ts`、`tests/e2e/staff-ritual.spec.ts` | 四角色、固定握杖、加载、眨眼、降级与业务隔离 |

相关旧手部浏览器测试显式模拟持杖素材失败，以继续验证保留的降级实现；正常路径由新测试及原正式流程回归覆盖。

## 验证

- `npm test`：74/74 通过，包括三个新增素材、能量与连续性测试。
- 类型检查、Lint、生产构建通过；设计预览原有三个 `<img>` 优化提示保留。
- 本轮 44 个不同浏览器用例通过：持杖 6、正式水晶流程 4、实时预览 2、旧角色/手部降级 20、退出/恢复/隐藏/异常重播 8、全素材缺失及多尺寸布局 4。全部包含桌面与手机。
- 尺寸检查覆盖 1920×1080、1440×900、1280×720、768×1024、390×844；手部与牌组没有横向溢出，原键盘控件保留。未重新运行全库所有浏览器用例。
- 浏览器运行未捕获页面错误，未写真实云端记录或调用付费解读。

没有改动牌阵、牌数、洗切算法、随机来源、正逆位、保存恢复或提交次数；自动切牌一次与后续自由抽牌规则保持原样。

## 画面与验收

- 四角色桌面/手机截图：`output/design/xingyue-staff-{star-moon|scholar|quqi|star-cap}-{desktop|mobile}.png`。
- [桌面实时洗切牌录像](../output/design/xingyue-staff-ritual-desktop.webm)、[手机录像](../output/design/xingyue-staff-ritual-mobile.webm)。
- 普通预览：`/design-preview?view=motion`；正常洗切牌：`/shuffle`。固定进度面板仅开发预览显示。

本版人物保留局部眨眼及已有点击台词，眼神/头部和法杖没有新增跟随动作。后续人物互动或整杖微倾可扩展当前接口；当前版本先以连贯固定握杖姿态为准。光弧与能量属于克制的二维表现，不做三维物理仿真。
