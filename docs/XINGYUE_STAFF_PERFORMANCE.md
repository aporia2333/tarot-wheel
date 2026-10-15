# 星月之间 · 法杖释放与人物施法表演

2026-10-13。依据用户确认的方案，在固定握杖版本上增加清楚的能量传递和自然的角色表演。四位角色均已接入正式 `/shuffle` 页面，并与动作预览共用实现。

## 当前效果

- 首轮洗牌开始，角色逐渐闭眼凝神，桌前的手连同袖子收回桌后；握杖的手、袖口和整根法杖作为同一块原画整体微倾，最大约 3°。身体只轻微前倾，没有拆开手指重新握杖。
- 杖尖聚能，月弧/星轨局部亮起，细光带中的流光朝水晶移动。水晶内部出现短暂扩张的涟漪、较清楚的薄雾和旋流，再接续原有浮牌动作。脸部、握杖处和桌面有浅反射。
- 睁眼后使用专注于水晶方向的表情。连续洗牌与洗后等待保持这套姿态，不在每一轮重复收手或抬杖。切牌时有一次很轻的凝神反馈。
- 自动切牌结束，光带与球内能量随落牌减弱，桌前手缓慢复位，人物转为柔和的浅笑；两个猫角色保留猫眼、毛爪和自然口鼻，使用放松的神情。
- 正常眨眼、原有点击人物台词和问题输入继续工作；本轮没有扩展新的互动剧情。

## 素材及面部衔接

原有 `staff-v1.png` 保留作为头发、头身、服装、握杖手和法杖的基础原画。新增每角色三幅表情素材，通过双眼及嘴部的三点仿射对齐，只在眼睑/眉部和口鼻的小范围羽化遮罩内混合。头发、耳饰、猫耳和帽子的轮廓保持原画，避免切换整个人物导致比例或位置变化。

空闲手臂使用整体遮罩转动与桌面遮挡，回收后的袖子使用新增原画的局部补底。握杖侧保持完整画出的袖口、腕点、手掌/毛爪与杖身，前景手和杖尾使用同一组变换。能量源的位置也从这组变换计算，防止微倾后杖尖与光源分离。

素材由内置 `image_gen.imagegen` 生成，参考现有持杖人物，要求真实透明背景。原始 PNG 原样复制到项目，没有位图裁切、合成或重新压缩；校准脚本只读取图片，写入 SVG 遮罩及变换数据。

| 角色 | 最终素材 | 文件大小 |
|---|---|---|
| 星月 | [staff-acting-v1.png](../public/characters/star-moon/staff-acting-v1.png) | 约 2.39 MB |
| 学者 | [staff-acting-v1.png](../public/characters/scholar/staff-acting-v1.png) | 约 2.26 MB |
| 曲奇猫 | [staff-acting-v1.png](../public/characters/quqi/staff-acting-v1.png) | 约 2.18 MB |
| 星帽猫 | [staff-acting-v1.png](../public/characters/star-cap/staff-acting-v1.png) | 约 2.34 MB |

每张原生 RGBA 图集尺寸为 2172×724，三个表情区域共用图片缓存。只加载当前所选角色；相对固定持杖版本，当前角色增加约 2.2–2.4 MB 的素材请求。完整提示词、参考图、工具输出、最终绝对路径和 SHA-256 见 [生成记录](XINGYUE_STAFF_PERFORMANCE_ASSET_PROMPTS.json)。

## 代码范围

| 文件 | 本轮修改 |
|---|---|
| `src/lib/staffPerformance.ts` | 同步到洗切牌时钟的纯视觉表演采样、连续回合及收势、整体手臂与杖尖位置 |
| `src/lib/staffMagicMotion.ts` | 提高细光弧与浅反射的可辨识度 |
| `src/components/preparation/StaffPortrait.tsx` | 三种表情、局部羽化混合、整臂回收、整体握杖微倾及桌前遮挡 |
| `src/components/preparation/StaffMagic.tsx` | 聚能环、随杖尖移动的光带、流光和反射 |
| `src/components/preparation/CrystalBall.tsx` | 能量到达时的球内涟漪、薄雾与切牌旋流 |
| `src/components/preparation/MagicPreparationRig.tsx` | 将同一操作进度提供给人物、法杖、水晶和原牌组 |
| `src/components/PreparationScene.tsx` | 当前角色表情素材加载、迟到与失败降级、前后人物实例同步 |
| `src/data/dealerCharacters.ts`、四套 `manifest.json` | 表情图集、面部对齐、整臂遮罩和轴点配置 |
| `src/app/design-preview/page.tsx` | 切牌完成后保留收势表情，正式组件的实时预览 |
| `scripts/inspect_staff_performance.py` | 原画眼部检测、三点对齐与元数据生成，不修改 PNG |
| `tests/staff-performance.test.ts`、`tests/e2e/staff-performance*.spec.ts` | 表情/动作顺序、源素材、四角色、加载失败、实时播放与状态隔离 |
| `tests/e2e/staff-ritual.spec.ts` | 原固定持杖检查适配整体微倾，继续验证基础原画和牌面不被换掉 |

没有新增应用依赖。复用 SVG、现有 RAF 和 `RITUAL_CONFIG` 时钟；姿态与透明度直接更新元素，不逐帧重建 React 组件。细光带的少量 SVG 路径随杖尖更新，流光更新 dashoffset，涉及局部重绘；没有新增大面积模糊滤镜或大量粒子。

减少动作模式取消手臂回收、身体微倾、法杖转动、光环旋转、光带流动和球内扩张涟漪，保留轻微表情及原减少动作准备流程。低质量模式关闭法杖光带、流光和桌面反射，光环保持静止。素材失败回退到固定持杖形象；持杖基础素材也失败才使用已有角色降级绑定。

## 保留的产品规则

牌组仍使用原保存操作计划中的 78 张真实牌及其分组/收拢顺序。人物表情和光效不生成随机数，不写阅读状态，不重新规划牌序，也不新增洗切牌提交。

自动切牌一次、洗牌次数范围、正逆位冻结与方向抽牌、两排牌扇、自由落牌、全部重抽、一起翻牌、牌阵之书和历史管理保持原样。退出、刷新、隐藏页面及异常重播继续使用现有恢复逻辑。

## 验证结果

- `npm test`：77/77 通过，含三项新增施法表演测试、素材检查及原牌序/恢复测试。
- 32 个不同浏览器用例通过，覆盖桌面与手机：四角色表演及新素材迟到/失败 10，实时星月施法 2，原持杖/眨眼/基础图失败 6，正式水晶流程及减少动作 4，退出/刷新/隐藏/异常重播 8，实时猫角色预览 2。
- 类型检查、Lint、生产构建通过。预览页原有三个 `<img>` 优化提示保留，无新增类型或 Lint 错误。
- 人工查看四角色凝神、释放、专注、收势截图及手机画面，修正初版耳饰叠入面部和嘴部叠影，核对桌前手的隐藏、袖口及杖尾衔接。
- 浏览器测试未捕获页面脚本错误。测试使用隔离本地模式，没有调用真实云端记录或付费解读；未在本轮重跑历史管理全套测试。

## 预览与录像

正常预览：[动作预览](http://127.0.0.1:3100/design-preview?view=motion)。点击「播放洗牌」，结束后点击「播放切牌」。正式用户流程仍自动切牌一次；预览的播放按钮用于分别检查两段动作。

- [星月完整实时施法 · 桌面](../output/design/xingyue-staff-performance-desktop.webm)
- [星月完整实时施法 · 手机](../output/design/xingyue-staff-performance-mobile.webm)
- [猫角色实时洗切牌 · 桌面](../output/design/xingyue-crystal-ritual-desktop.webm)
- [猫角色实时洗切牌 · 手机](../output/design/xingyue-crystal-ritual-mobile.webm)
- [桌面施法画面](../output/design/xingyue-performance-casting-desktop.png)，从实时录屏提取原帧；未合成光效。
- [手机收势画面](../output/design/xingyue-performance-finish-mobile.png)

这是二维局部表情混合与整体肢体表演。握杖手没有独立指节收紧，袖子没有三维布料仿真，人物尚未增加新的耳朵/胡须/剧情互动。后续可以在同一套接口上细化这些表现。
