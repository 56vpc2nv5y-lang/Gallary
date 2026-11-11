# The Art of Noticing · 看见的艺术

这是 Sunny 的私人摄影杂志。**所有视图读取同一份 `data/photos.json`**，确保首页、展厅、四季、地图和拼贴工作台展示一致的真实照片。

- 当前共有 **16 张照片**，保留了杂志封面、四个章节、原本的拼贴拖拽与 PNG 导出。
- **展厅**：按照每张照片的横竖比例与实际构图编排；所有照片使用自然比例显示，不再强制裁剪成统一形状。完整尺寸用于杂志视图，缩略图用于网格视图。
- **四季**：点击春夏秋冬会同时筛选照片并改变背景氛围：春日花瓣、夏日萤火、秋日落叶、冬日雪花。粒子可以暂停；**照片本身保持静止**，不使用 GIF、碎片动画或自动幻灯片。季节标签属于编辑分类，**不等于精确拍摄日期**。
- **足迹**：世界 → 北京 / 阿斯塔纳 → 香山公园 / 颐和园昆明湖 / 八达岭长城 / Astana Opera → 对应照片。**所有坐标指向公共景点，而非相机拍摄位置**。
- **纪念手帐工作台**：可自由从照片库选择 5 张，也支持本地临时选图；填写标题、地点、日期、心情短句，选择宣纸手帐／旅行明信片／摄影杂志，实时预览并导出 1800×1350 PNG。草稿仅存当前浏览器，不会假装自动公开。
- 原本的 16 张中，11 张新照片使用 `data/embedded_photos.js` 的网页压缩内嵌图（因为 GitHub 版本没有对应的 `assets/photos/*.webp` 实体文件），另 5 张北京照片为仓库实体文件。此文件只是图片字节缓存，**不是另一份照片清单**。

## 预览网站

网站地址：<https://56vpc2nv5y-lang.github.io/Gallary/>

GitHub Pages 设置：Settings → Pages → Deploy from a branch → `main` / `/(root)`。GitHub Pages 可能需要一点时间更新。地图现为无需第三方资源的内建可点击地理示意图。世界陆地轮廓来自 public-domain Natural Earth（已打包在 `data/worldmap.js`）；地点标注是经确认的公共地标而非原始拍摄 GPS。

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

## V5 · 纪念手帐 & 精选新照片（2026-11-11）

已在页面加入可编辑的手帐工作台：**标题、地点、日期或季节、短句、3 种纸张风格**。照片可从公开画廊任选五张；也可以用“选本地图片”临时选图并立即导出，这些本地图片不会自动公开。布局和文字草稿在当前浏览器保存，导出的 PNG 是独立的高清纪念页。

本次从用户提供的 38 张新照片中精选 **21 张**，优化为 WebP 原尺寸版（最长边不超过 1600px）及缩略图（最长边不超过 440px），并移除所有导出图的 EXIF 元数据。**目前这 21 张的编辑信息已经加入 `data/curated-v5.json`，但图片二进制文件还未上传到 GitHub 仓库，页面仍展示旧有 16 张。**这一点很重要，不应将准备好的照片错误地当成已发布。

为了让新增图片真正公开，现在只需要**把精选 ZIP 文件原样上传到 [`imports/`](https://github.com/56vpc2nv5y-lang/Gallary/tree/main/imports)**，无需解压或逐张上传。GitHub Action 会安全地解包里面的 42 个 WebP 图片文件，从 `data/curated-v5.json` 读取标题、季节、风格和笔记，自动更新 `data/photos.json` 与 `data/photos.js`，并删除已处理 ZIP。无需手动维护照片数据。若自动提交失败，检查 GitHub Actions 的写入权限。

日期不明的照片继续保留空日期；无法确认地点的图片不会猜测 GPS。唯一新加入的明确公共地标是图片中可辨识的 **Cavenagh Bridge · Singapore**，用公开桥梁坐标而非私人拍摄坐标打点。

文件改动：

- `index.html`：新增纪念手帐编辑面板、本地临时选图入口
- `js/app.js`：草稿自动保存、即时版式预览、自由选图、高清带文字导出
- `css/style.css`：三种纸张风格与移动端编辑布局
- `data/curated-v5.json`：21 张图片经人工筛选的待发布记录
- `scripts/sync_photos.py`：新增图片上传后自动使用人工撰写标题与地点等字段



## Editorial V2 · 更安静的摄影杂志（2026-11-11）

改版重点是让真实照片、杂志拼贴和可探索的互动取得平衡。

- 首页以北京秋日为主图，同时保留可点击的小猫与阿斯塔纳小照片拼贴，兼顾杂志封面和旅行手帐的感觉。
- 选集按照北京、偶遇、建筑、光影展开，四个章节直达同一套正式照片清单。
- 展厅使用人工编排的图片跨度、适度留白和原比例图片；过滤和灯箱仍然可用。
- 昆明湖照片保持静止，灯箱不自动播放；四季氛围粒子作为独立 canvas 运行，不会改动照片像素或触发图片动画。
- 地图使用已经打包的 Natural Earth 陆地轮廓，城市层使用地点相对位置坐标，不再虚构道路。它不是街道导航地图。
- 纪念手帐默认展开，原来的拖拽、选图、填写文字与导出 PNG 继续可用；首页提供进入工作台的快捷入口。
- `css/editorial-v2.css` 是摄影排版层，尽量不修改既有地图与手帐的交互逻辑。
- `scripts/check_gallery_runtime.mjs` 检查照片加载来源与基础初始化；`scripts/check_ambience_runtime.mjs` 检查粒子能绘制、切换与暂停，并尊重减少动态效果的系统设置。

**照片发布状态：** 正式清单目前是 **16 张**；`data/curated-v5.json` 中的另 **21 张** 仍然只是准备好的编辑信息。对应的 42 个 WebP 文件尚未上传到本仓库，因此不能提前算作已发布照片。将此前制作的 ZIP 包放入 `imports/` 后，现有发布工作流会负责索引。请勿直接把 21 条数据加入展示清单却不上传文件。

改版前状态备份在 `backup/editorial-v2-start-20261111` 分支。

## Interactive editorial restoration（2026-11-11）

之前将“照片静止”错误地等同于“整个网站没有动态”。现在明确区分：**真实照片不动，但四季粒子、按钮反馈、浏览与创作工具可交互**。首页新增四季快速选择、暂停粒子、随机翻页，恢复小幅叠放的静态照片；章节与足迹链接照旧通向真实内容。粒子只有视觉氛围，不会遮挡按钮或改变照片。
