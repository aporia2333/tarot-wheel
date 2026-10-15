# 曲奇应用皮肤

接入已确认的 `v9-fifteen-remake-single-cat-v1`：78张牌面和1张牌背，15张重制；权杖五沿用v9原画。

网站使用828×1428的JPG资源。2026-10-16按要求删除了制作工作目录 `output/imagegen/quqi/`，其中包含原始PNG、印刷文件、旧版和压缩包；网站所需的79张成品JPG全部保留在本目录。
稳定牌ID映射见 `manifest.json`，文件SHA256见 `checksums.json`。
如需重新导入外部保存的交付版本，可运行 `python scripts/sync-quqi-skin.py <交付目录>`，该目录应包含 `cards.json` 和 `mobile/*.jpg`。网站运行与构建不依赖制作工作目录。

顶部“牌面皮肤”可选择原版或曲奇。选择保存于当前浏览器，适用于首页示意、牌背、抽牌结果及历史记录的展示。
