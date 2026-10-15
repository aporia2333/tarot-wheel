# 角色生图提示词

## R05 / R05.1 当前版本

本轮使用 Codex 内置 imagegen。精确生产提示词保存在 `output/design/r05-production-prompts.json`；用户要求“猫更像猫、爪子更可爱”后的最终猫形重绘与透明桌面提示词在 `output/design/r05-feline-refinement-prompts.json`。当前图集改为 **4×4**，包含五种头部表情、躯干、独立上臂与前臂、张开/夹持/托牌六个手势，格位见 `DEALER_ASSETS.md`。人形使用 v2，猫形使用 v3。

最终猫形约束：自然猫脸、三角耳、胡须、猫口鼻，没有人类头发；毛绒短爪、圆趾、收起尖爪，托牌爪有粉色肉垫，没有人类手指。背景与桌面分别生成，不将静态人物或牌画入场景。场景合成和牌包动作由代码负责。

以下 4×2 模板留作 **R01–R04 历史记录**，不可直接替代当前 4×4 图集。

使用 Codex 内置 imagegen，`transparent_background: true`。按角色分别生成图集，不要将多个角色放到一张图。生成后检查八格部件、alpha、身份一致性、越格、手指和裁切，再复制进项目，并调整 manifest 的格内裁切。不要直接覆盖已发布图集。

## 共用模板

```text
Use case: stylized-concept.
Asset type: production layered sprite atlas for a chibi tarot dealer in a deep green and muted gold tarot website.
Create ONE wide 2:1 transparent-alpha PNG, exactly 4 columns by 2 rows of EQUAL square cells.
Eight isolated pieces, centered in respective cells, 10–12% transparent margin, nothing crossing cell edges.
No labels, borders, text, checkerboard, matte, scene, cards, or assembled character.
Character: [CHARACTER BRIEF]. Soft hand-painted gouache, clean warm fine outlines, frontal seated character, soft upper-left lighting, friendly quietly magical, 2.5 head proportions.
Grid order across top row: 1 torso/body ONLY neck to waist, no head, no arms or hands; 2 complete normal head with hair/ears/hat; 3 same identical head smiling; 4 same identical head focused.
Across bottom row: 5 isolated LEFT arm/sleeve straight downward, shoulder centered x50% y15%, wrist centered x50% y85%, NO hand; 6 matching RIGHT arm/sleeve, NO hand; 7 isolated left relaxed card-gripping hand or CAT paw, wrist at top, fingers/toes downward; 8 matching right hand/paw.
Consistent identity, outfit, colors, lighting and proportions in every cell. Actual transparent alpha outside painted parts. Body MUST be armless; separate arms are joint-rotated in code and hands are moved to contact card packets.
Avoid duplicate limbs, extra fingers, mismatched wrists, dislocated joints, changing clothes, cut-off ears or hat, crossing cell boundaries, text, scenery, and shadows painted outside parts. Cats have fluffy CAT paws with three small round toe bumps, NEVER human hands.
```

## 本轮角色设定

| ID | 替换到模板的角色设定 |
| --- | --- |
| star-moon | Young adult gentle human woman, warm light skin, short midnight brown bob hair, deep evergreen moon embroidered robe, dark teal shawl with small restrained gold stars and crescent clasp. Three softly curved finger lines to suggest a natural five-finger grip. |
| scholar | Friendly chibi human young adult male tarot scholar, chestnut wavy short hair, small round bronze spectacles, warm ivory skin, dark forest green tunic with restrained antique gold embroidery, muted olive shoulder mantle, small crescent brooch. |
| quqi | Fluffy cream and ginger tabby CAT, round head, amber eyes, small pink nose, natural muzzle, triangular ears, deep evergreen velvet tarot robe, moss green shawl, tiny antique gold crescent clasp. Matching a warm hand-painted cat tarot deck. |
| star-cap | Fluffy blue gray CAT, pale muzzle, silver green eyes, lilac-gray nose, triangular ears, small midnight teal pointed wizard cap with restrained gold stars and crescent, evergreen robe, midnight blue shawl, gold moon clasp. Friendly slightly mysterious. |

## 迭代与动作素材

修订时将已有图集作为身份参考/编辑目标，指定只修改某一部件或表情；明确保持格位、透明背景、角色身份、服装、朝向、光线不变。先用 view_image 查看本地目标，再调用内置图像编辑工具。

当前全部动作由分层部件与同一牌包时间轴驱动：过手（取小包、转移、落包）、交错（两摞提起、交替落牌、压齐）、桌面混洗（双手摊开、画圈混合、收拢）、分叠（逐包移动、重新合拢）、双叠切牌、三叠切牌、自由切牌。

后续专用手势模板：保持同一角色、同一腕口、同一格位，分别生成掌背向下的张开手、侧夹手、托牌手。猫形只生成猫爪。若改用逐帧序列，需要给每个动作标明同一画布、桌边、腕/握牌锚点、起始帧与最后落牌帧，并扩展渲染器；不能用一张未分层的全身图代替动作素材。
```
Use case: identity-preserve.
Input image: existing atlas, edit target and identity reference.
Change ONLY [specified cell/part]. Keep every other cell pixel-aligned and unchanged; preserve costume, lighting, identity, framing and alpha.
Required pose/expression: [specific pose]. Maintain the same shoulder/wrist anchors and safe margins. No extra digits or limbs, no text, no backdrop.
```
