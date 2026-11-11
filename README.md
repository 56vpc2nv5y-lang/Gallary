# The Art of Noticing · 看见的艺术

这是 Sunny 的个人摄影杂志，在原有 `Gallary` 上升级。**所有页面读取同一份 `data/photos.json`**，不再存在“浏览器里加了照片，但其他人看不到”的假发布入口。

- 当前共有 **16 张照片**，保留了杂志封面、四个章节、原本的拼贴拖拽与 PNG 导出。
- **展厅**：地点已确认的中国照片配宣纸感装裱，阿斯塔纳歌剧院配细金框，未确认地点使用中性相框。
- **四季**：点击春夏秋冬会同时筛选照片和切换飘落动态；可随时查看全部季节。季节标签属于作品分类，**不等于精确拍摄日期**。
- **足迹**：世界 → 北京 / 阿斯塔纳 → 香山公园 / 颐和园昆明湖 / 八达岭长城 / Astana Opera → 对应照片。**所有坐标指向公共景点，而非相机拍摄位置**。
- **拼贴台**：五张作品可拖拽、方向键微调、随机重排、切换章节、导出 PNG。素材同样来自 `data/photos.json`。
- 原本的 16 张中，11 张新照片使用 `data/embedded_photos.js` 的网页压缩内嵌图（因为 GitHub 版本没有对应的 `assets/photos/*.webp` 实体文件），另 5 张北京照片为仓库实体文件。此文件只是图片字节缓存，**不是另一份照片清单**。

## 预览网站

网站地址：<https://56vpc2nv5y-lang.github.io/Gallary/>

GitHub Pages 设置：Settings → Pages → Deploy from a branch → `main` / `/(root)`。GitHub Pages 可能需要数分钟更新。Leaflet/OpenStreetMap 地图需要联网加载。

本地预览不要直接双击 `index.html`，需在仓库根目录启动 HTTP 服务：

```sh
python -m http.server 8000
```

浏览器打开 <http://localhost:8000>。

## 真正添加新照片

1. **先清理隐私**：仓库是公开的，上传前请去掉原图 EXIF GPS、私人地址、敏感人物与不希望公开的信息。仅靠网页隐藏 GPS 并不能擦掉已经公开上传的原片及 Git 历史。
2. 打开 [GitHub 上传照片](https://github.com/56vpc2nv5y-lang/Gallary/upload/main/assets/photos)，上传一张或多张已经清理元数据的 `.webp` / `.jpg` / `.png` 图片，提交到 `main`。
3. `.github/workflows/publish-photos.yml` 在图片提交后运行 `scripts/sync_photos.py`，**自动把新图片写入 `data/photos.json`**。接下来 GitHub Pages 更新后，各设备和访客都能看到。如仓库禁止 Actions 写入，请在仓库设置开放 Actions 的 Contents write permission，或在本地运行同步脚本后自行提交 JSON。
4. 新照片初始标题来自文件名，章节默认为“光与四季”，季节为 `unknown`，地点留空。进入 `data/photos.json` 编辑 `title`、`note`、`season`、`series`、`style`，需要地图标记再填入**经确认的公共景点**名称与坐标。

本地手动同步清单可运行：

```sh
python -m pip install Pillow
python scripts/sync_photos.py
```

请勿将相机的精准 GPS 或私人住址直接复制到 JSON。已确认的景点以公共地标坐标替代，并用 `geoPrecision` 注明 `landmark` 或 `park`。不要猜测未知照片的地点与日期。

## 数据结构

`data/photos.json` 的每条照片字段：

```json
{
  "id": "opera",
  "src": "assets/photos/07-astana-opera.webp",
  "thumb": "assets/photos/07-astana-opera-thumb.webp",
  "title": "光落在歌剧院的柱廊",
  "note": "蓝天、白色石柱，与建筑前那一点小小的人影。",
  "date": null,
  "season": "autumn",
  "country": "Kazakhstan",
  "city": "Astana",
  "place": "Astana Opera",
  "lat": 51.13495,
  "lng": 71.41052,
  "style": "western",
  "chapter": "architecture"
}
```

地点资料来源：北京香山公园（北京市政府/香山公园）、昆明湖（公开地理资料）、八达岭长城（公开地理资料）、Astana Opera（Opera Europa）。坐标只用于呈现地标位置，不宣称照片的具体拍摄 GPS。

## 技术结构

```text
index.html                         杂志主页面
css/style.css                      装裱、季节、地图与移动适配
js/app.js                          JSON 数据加载、展厅、足迹、季节、拼贴
data/photos.json                   唯一照片内容清单
data/embedded_photos.js            旧 11 张优化图像字节（兼容）
assets/photos/                     既有 5 张北京照片；今后新增照片
scripts/sync_photos.py             新照片自动入库（不会发布 EXIF GPS）
.github/workflows/publish-photos.yml 上传后的自动索引
```

旧版已备份于 `archive/gallery-before-magazine-v2` 分支，原先手动维护的 `data/gallery.js` 不再由网站读取。
