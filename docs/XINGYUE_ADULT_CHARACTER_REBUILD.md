# 星月之间：成人比例角色整套重制

2026-10-12 的袖子骨骼、主控手及水晶洗切衔接改进见 [水晶控牌实施报告](XINGYUE_CRYSTAL_RITUAL_V5.md)。本页为素材生成过程记录，现行比例参数以角色 manifest 为准。

2026-10-11。针对头身、手掌和手臂始终难以协调、人物像大头娃娃的反馈，重做四位角色的整体设计与配套肢体。执行工具为内置 image_gen.imagegen；生成透明 PNG，原样复制到项目，旧图保留。

## 最终资产

| 角色 | 连贯形象与表情 | 配套衣袖和手部 |
| --- | --- | --- |
| star-moon | public/characters/star-moon/portrait-v2.png | public/characters/star-moon/limbs-v1.png |
| scholar | public/characters/scholar/portrait-v2.png | public/characters/scholar/limbs-v1.png |
| quqi | public/characters/quqi/portrait-v2.png | public/characters/quqi/limbs-v1.png |
| star-cap | public/characters/star-cap/portrait-v2.png | public/characters/star-cap/limbs-v1.png |

八份图均为 1254 × 1254 RGBA。形象表情图为三列两行，保持完整头、颈、胸、肩、腰腹的连续绘画；肢体图为四列三行，包括上臂、前臂、手背、侧面、手掌和抓握姿势。猫使用毛爪和肉垫，避免人手。

人形收小头部占比、增加躯干长度和肩宽；猫保留成年猫面部、胡须与胸毛，改成更完整的袍身。图集实际留白和行高并非严格均匀，按原始像素校准裁切，保持同一角色表情的显示尺寸一致。新图在桌沿前可见的躯干比旧版完整，避免裁切后只剩大头。

## 接入与动作

- manifest 更新连贯形象、肩部和眼部锚点，以及与新身体匹配的手臂骨长、袖管与手掌尺寸。
- DealerPortrait 保留头颈与躯干同图层，眨眼仅覆盖眼部；躯干遮罩将原图用于设计参考的自然下垂手臂留给配套动画图层。
- DealerArm 和 MagicPreparationRig 使用配套素材。手背 → 侧面 → 手掌保持同一个手腕中心，抓握另用新图的抓握姿势。
- LimbSprite 统一渲染并裁掉图集中相邻行的图像，避免下一排的袖口出现在手掌下面。
- 连贯形象或肢体加载失败仍可使用原图与基础图形完成流程。增加 data-rig-state 供加载与回退检查。
- 不改变洗切牌的计划、牌组轨迹、腕部轨迹、基础正逆位、提交时机及保存逻辑。原历史操作继续可续播。

## 提示词与生成方式

完整的八条最终提示词、各自参考图和绝对保存路径记录在同目录 XINGYUE_ADULT_CHARACTER_PROMPTS.json。使用内置 image_gen，未使用 API CLI，未重绘或改写生成图的 alpha。

## 验证

类型检查、58 项单元测试、生产构建与 26 项桌面/手机浏览器回归通过。覆盖四位角色的切换和眨眼、缺失素材回退与恢复、真实时间洗切、刷新续播、减少动态效果、自动切一次、问题草稿、牌阵书与四个目标尺寸。生产构建仍有 design-preview 页面原有的三处原生 img 提示。未调用真实云端账号或付费 AI。

实际界面截图存放在 output/design/xingyue-adult-star-moon-final.png 和 xingyue-adult-quqi-final.png；四位角色及洗切动画的桌面/手机回归图也在 output/design。

