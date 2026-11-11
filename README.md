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

GitHub Pages 设置：Settings → Pages → Deploy from a branch → `main` / `/(root)`。GitHub Pages 可能需要一点时间更新。地图现为无需第三方资源的内建可点击地理示意图，页面不会因为地图 CDN 不可用而空白。

V4 已支持双击 `index.html` 打开静态展厅与足迹示意图（依赖同文件夹下的 `data/photos.js`、图片缓存）。建议使用 HTTP 服务进行完整预览：

```sh
python -m http.server 8000
```

浏览器打开 <http://localhost:8000>。

## 真正添加新照片

1. **先清理隐私**：仓库是公开的，上传前请去掉原图 EXIF GPS、私人地址、敏感人物与不希望公开的信息。仅靠网页隐藏 GPS 并不能擦掉已经公开上传的原片及 Git 历史。
2. 打开 [GitHub 上传照片](https://github.com/56vpc2nv5y-lang/Gallary/upload/main/assets/photos)，上传一张或多张已经清理元数据的 `.webp` / `.jpg` / `.png` 图片，提交到 `main`。
3. `.github/workflows/publish-photos.yml` 在图片或清单更改后运行 `scripts/sync_photos.py`，**自动把新图片写入 `data/photos.json` 并生成兼容静态打开方式的 `data/photos.js`**。接下来 GitHub Pages 更新后，各设备和访客都能看到。如仓库禁止 Actions 写入，请在仓库设置开放 Actions 的 Contents write permission，或在本地运行同步脚本后自行提交 JSON。
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
data/photos.json                   唯一人工维护的照片内容清单
data/photos.js                     根据 photos.json 自动生成的静态读取版本
data/embedded_photos.js            旧 11 张优化图像字节（兼容）
assets/photos/                     既有 5 张北京照片；今后新增照片
scripts/sync_photos.py             新照片自动入库（不会发布 EXIF GPS）
.github/workflows/publish-photos.yml 上传后的自动索引
```

旧版已备份于 `archive/gallery-before-magazine-v2` 分支，原先手动维护的 `data/gallery.js` 不再由网站读取。

## V4 稳定性与拼贴调整

- 修复原版本依赖 `fetch('data/photos.json')` 的问题：现在默认加载 `data/photos.js`，即使网页是直接打开的 HTML 文件，也能读取同一份照片清单；`photos.json` 仍是唯一需要人工编辑的数据源。
- 地图改为内建可点击的世界/城市地理示意图，城市和地点从真实经纬度计算位置，无需 Leaflet CDN、远程瓦片或第三方 API。它**不是街道导航底图**，不显示个人精确 GPS。
- 拼贴台增加全库缩略图选择，可以逐张替换五张素材或随机选五张；保留原来的拖动、键盘移动和 PNG 导出。新的照片也会自动进入选图列表。
- 图片上传前请自行去掉照片文件的 EXIF GPS：程序不把 GPS 写入 JSON，并不等于公开仓库中的原始上传文件会自动去除 GPS。
