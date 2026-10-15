# 星月之间 · 历史管理与角色细节实施报告

本轮接续 [水晶控牌 v5](XINGYUE_CRYSTAL_RITUAL_V5.md) 和 [人物施法动作精修](XINGYUE_ACTOR_GESTURE_REFINEMENT.md)，补齐历史页操作入口，并实现现有画风下的二维角色细节绑定。全部接入正式页面，动作预览与正式洗切牌共用组件。

后续按用户选择，正常角色表演已改为 [固定握杖施法版本](XINGYUE_FIXED_STAFF_RITUAL.md)，再增加 [法杖释放与人物施法表演](XINGYUE_STAFF_PERFORMANCE.md)。下方手部、衣褶与发丝实现保留作素材失败时的降级；历史管理仍为正常功能。

## 一、历史删除与清空

- `/history` 每条阅读增加独立的「删除」按钮，原有查看阅读链接继续工作，避免在链接内嵌套按钮。
- 页头增加「清空历史」。确认框说明删除范围、牌面/解读/追问一并删除，以及删除后无法恢复。
- 默认焦点位于「取消」，支持键盘、Escape、点击框外取消。请求期间禁用重复提交；成功后更新列表并恢复焦点，失败则保留原记录和错误提示，允许重试。
- 本地模式只处理 `tarot_readings_v1`，不清除牌面皮肤、占卜师或自定义牌阵设置。存储写入被拒绝时明确报错，不假装删除成功。
- 云端增加 `DELETE /api/readings`：校验登录后，用当前 `user_id` 一次删除该账号的全部记录，包括列表上限 100 条之外的记录。单条删除也显式校验记录 ID 和当前用户。其他用户的记录不受影响。
- 桌面、手机及 320px 窄窗口保留全部操作，无水平文字溢出。

## 二、逐指关节与手部素材

- 人形每只手有五根独立手指，拇指两段、其余各三段，共 14 段关节；两个猫角色每只爪有四个可见脚趾，各两段，共 8 段。
- 每段使用独立仿射蒙皮，指根固定，相邻指节共用端点。收指幅度随现有主控/引导手的张力输入变化，保留角色之间的差异。
- 新增星月、学者两套透明掌心和指部纹理，修正掌心朝向时不应出现指甲的素材问题。猫角色复用原爪垫、毛边贴图。
- 袖口和腕点保持原绑定。手背与侧手继续使用原有纹理过渡，掌心阶段切换到关节驱动的指部；减少动作模式仍能看到完整手形。
- 素材延迟加载保持当前腕点和姿势；缺图时回退为原完整手势，不丢失整只手。

新增文件：`public/characters/star-moon/fingers-v1.png`、`public/characters/scholar/fingers-v1.png`。两张图均为图像生成工具的透明 PNG 原样复制，原角色素材未修改。生成与定向修订提示词见 [素材记录](XINGYUE_FINGER_ASSET_PROMPTS.json)。`scripts/inspect_finger_atlas.py` 只读取透明区域并生成 UV 数据，不修改位图；UV 保存在对应角色的 `manifest.json`。

## 三、独立眼球、衣褶与发丝

- 每个角色有两个独立眼球层，虹膜在固定眼睑遮罩内跟随真实牌组的关注方向，巩膜有柔和阴影。眨眼与身体表情保持分离。
- 根据待机、微笑、施法和思考素材分别校准眼部位置；猫角色低头施法时采用该表情的虹膜纹理与坐标，眨眼纹理也分别对齐左右眼，避免额头重影。
- 人形原施法素材为闭眼姿态：蓄力时保留闭眼，中段只在眼部羽化区域逐渐合成原睁眼素材，再跟随牌组；结束时自然闭合。躯干不随睁眼切换。
- 桌面每段袖子使用 8 个三角形对原绘制衣褶进行网格变形，整个人物共 32 个三角形。弯曲、轻微重力下垂和压褶共同作用，肩/腕两端保持连接。
- 每个角色拆出两束前景发丝或颊部毛束，根部固定，随前倾和施法进度做小幅随动与回稳。最大旋转限制为 0.65°，没有持续飘动。
- 手机、减少动作和简化质量下关闭袖子网格，沿用原袖子纹理与稳定袖口。缺图继续使用已有降级形象。

### 当前实现边界

这是 **二维/2.5D 骨骼与纹理网格版本**。指节弯曲使用深度投影，眼球使用独立纹理层，衣褶使用现有绘画网格形变，头发按两束绑定；没有引入真实三维手模型、布料碰撞求解或逐根发丝物理系统。背面到侧面的腕部转动仍保留预绘纹理。当前结果适合本项目现有的绘画人物与浏览器性能预算。

## 四、修改范围

| 文件/组件 | 职责 |
|---|---|
| `src/app/history/page.tsx`、`room-pages.css` | 历史列表、删除/清空、确认框、响应式 |
| `src/lib/readings/client.ts`、`storage.ts` | 云端/本地清空，存储失败反馈 |
| `src/app/api/readings/route.ts`、`[id]/route.ts` | 当前账号范围内的批量及单条删除 |
| `src/lib/actorDetailRig.ts` | 指节、三角形蒙皮、眼睛校准、发丝随动、睁眼曲线 |
| `FingerRig.tsx`、`FingerTexture.tsx` | 逐指纹理绑定、加载/失败降级 |
| `ClothMesh.tsx`、`DealerArm.tsx` | 袖子蒙皮、稳定腕点、原手势兼容 |
| `DealerPortrait.tsx` | 独立眼球、眼部过渡、发丝绑定 |
| `MagicPreparationRig.tsx`、`PreparationScene.tsx` | 将已有动作进度传入细节层、质量简化 |
| `dealerCharacters.ts`、两个人形 `manifest.json` | 新纹理类型与 UV 数据 |
| `tests/actor-detail-rig.test.ts`、历史相关单元测试 | 关节/网格连续性、删除与清空契约 |
| `tests/e2e/actor-details.spec.ts`、`history-management.spec.ts` | 四角色、响应式、缺图、延迟加载、删除失败/重试 |
| `tests/e2e-cloud/history-management.spec.ts`、模拟服务 | 102 条记录、身份隔离、认证和失败恢复 |

动作每帧通过既有 RAF 和引用更新 SVG 属性，避免用 React 状态逐帧重绘。复用已有前端技术，没有新增应用依赖。

## 五、原有业务保留

没有修改牌阵定义、牌数、抽牌算法、随机来源、洗切计划、正逆位、操作提交和保存恢复。保留自动切牌一次、向上/向下抽取、全部重抽、自由摆牌、一起翻牌及牌阵之书。角色细节仅消费同一动作计划的采样结果，不额外抽样随机数；开发固定种子回放仍与阅读状态隔离。

## 六、验证

| 检查 | 结果 |
|---|---|
| `npm test` | 71/71 通过，包括新增关节、网格、发丝/眼部曲线及历史存储验证 |
| `npm run typecheck` | 通过 |
| `npm run lint` | 通过；设计预览原有三条 `<img>` 提示保留 |
| `npm run build` | 通过 |
| 本地浏览器回归 | 26 个不同用例均通过：角色细节 6、连贯人物 6、切牌精修 8、历史管理 4、实时洗切牌 2 |
| 最后补跑 | 睁眼过渡及猫角色表情坐标修正后，角色细节/连贯人物/实时洗切牌 14/14 再次通过；历史桌面和手机 4/4 再次通过 |
| 模拟云端 | 1/1 通过：未登录 401、102 条历史、超过列表上限的清空、其他账号保护、删除失败后重试 |

以上浏览器数字按不同用例统计，补跑不重复计入 26 项。云端检查使用项目模拟服务，本轮未删除真实用户记录或调用付费解读。此报告不代表全库所有浏览器用例重新运行。

## 实际画面与录像

- [星月角色](../output/design/xingyue-actor-details-star-moon-desktop.png)、[学者角色](../output/design/xingyue-actor-details-scholar-desktop.png)、[曲奇猫](../output/design/xingyue-actor-details-quqi-desktop.png)、[星帽猫](../output/design/xingyue-actor-details-star-cap-desktop.png)
- [历史页桌面](../output/design/xingyue-history-overview-desktop.png)、[历史确认框](../output/design/xingyue-history-confirm-desktop.png)、[手机历史页](../output/design/xingyue-history-overview-mobile.png)
- [最新桌面实时洗切牌录像](../output/design/xingyue-crystal-ritual-desktop.webm)、[手机录像](../output/design/xingyue-crystal-ritual-mobile.webm)

角色截图使用开发固定进度面板；正常页面不展示该面板。历史截图仅包含隔离的测试数据。
