> **GitHub 同步状态（2026-11-11）：** 这份 V2 杂志源码已直接提交到本仓库的 `main`，不需要再上传 ZIP。11 张新增照片采用 `data/embedded_photos.js` 内嵌的网页优化版本；原来的 5 张北京照片文件仍位于 `assets/photos/`。若 GitHub Pages 尚未启用，请在 Settings → Pages 选择 `main` 和 `/(root)`。旧版已备份于 `archive/gallery-before-magazine-v2` 分支。\n\n# The Art of Noticing · 看见的艺术

一本可以慢慢长大的私人摄影杂志。**不是只属于北京秋日的单次展览**：它可以收纳旅行、动物、建筑、光线、绿叶和雪景。

## 这次已经收录

- 你刚刚重新发来的 11 张照片：巨蜥、绿色建筑、树冠、彩绘穹顶、城市日落、秋叶、Astana Opera、灰猫、装饰建筑、彩色教堂、雪景。
- 之前收录的 5 张北京香山与颐和园照片。它们保留为独立的 **Golden Days** 章节。
- 共计 16 张照片，每张包含正片与网页缩略图。原件仅做适度 WebP 压缩以提升网站加载速度。

## 打开方式

双击最外层的 `index.html` 即可查看静态页面。浏览器本地图片上传功能建议通过 **VS Code Live Server** 或其他本地 HTTP 服务器体验，以避免 `file://` 浏览器存储限制。

也可以运行：

```sh
python -m http.server 8000
```

然后打开 `http://localhost:8000`。无需 npm、Node、API 密钥或数据库。

## 本地 ZIP 与 GitHub 版本的区别

项目：`https://github.com/56vpc2nv5y-lang/Gallary`

以下步骤只用于你希望**用下载版的更高清图片替换 GitHub 的内嵌网页图片**时；普通预览无需执行。\n\n1. 将本 ZIP 解压。
2. 进入仓库，选择 **Add file → Upload files**。
3. 将 ZIP 解压后最外层的文件、文件夹一次性拖入上传区域，提交到 `main`。原仓库中的旧五张照片会被同路径覆盖为相同内容；新增照片进入 `assets/photos/`。
4. GitHub Pages 选择 **Settings → Pages → Deploy from a branch → main / (root)**。
5. 打开 `https://56vpc2nv5y-lang.github.io/Gallary/`。

当前 GitHub 版本已经同步。若使用独立下载的 ZIP，仍可按以上步骤手动用本地照片覆盖网页优化版本。

## 交互

- 杂志首页、编辑寄语、四组摄影专题及完整档案。
- 照片按「全部 / 小小相遇 / 建筑手记 / 光与四季 / 北京秋日」筛选。
- 自由切换杂志错落布局和整齐网格。
- 点击照片打开灯箱，支持左右键、触摸滑动、自动播放。
- 切换春夏秋冬氛围，有花瓣、绿叶、落叶、雪花动态，并支持关闭。
- 五张照片可拖拽拼贴，有三种版型，支持随机重排、浏览器记忆和 PNG 海报导出。
- 网站上的「收下新的照片」使用浏览器 IndexedDB 本地存储，可以写标题和简短说明，刷新后通常仍在，但**不会自动发布到 GitHub**。建议定期保留本地原图。

## 添加永久作品

编辑 `data/gallery.js` 的 `photos` 数组，在 `assets/photos/` 加入 WebP 或 JPG 照片，再提交到 GitHub。每张作品可以写 `title`、`en`、`series`、`season`、`note`、`location`、`alt`。不确定日期/地点时可以留空，**不要虚构照片信息**。

## 文件说明

```
index.html               主要页面
css/style.css            杂志样式及适配
js/app.js                全部交互 / IndexedDB / Canvas / 拼贴导出
data/gallery.js          照片内容清单，便于未来持续更新
assets/photos/           16 张摄影原图的网页优化版 + 对应缩略图
assets/favicon.svg       自绘图标
```

图片和文字仅供个人使用；未经授权请勿转载。
