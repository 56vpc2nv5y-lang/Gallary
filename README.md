# The Art of Noticing · 看见的艺术

一本以四季为线索、可以自由拼贴的私人摄影杂志。第一期收藏 **2026 年 11 月 10 日，北京香山和颐和园** 的五张原创照片。

## 立即打开

- GitHub Pages: https://56vpc2nv5y-lang.github.io/Gallary/ （如果暂未启用 Pages，先去仓库 Settings → Pages → Deploy from a branch → main / root）
- 本地预览：下载仓库，双击根目录的 `index.html`，不需要安装 npm、Node 或数据库。

## 已有功能

- **可拖拽拼贴工作台**：5 张 Polaroid 照片自由移动；「杂志散页」「星点排列」「时光长卷」三种模板；随机洗牌与恢复排版。
- **保存拼贴位置**：使用浏览器 `localStorage`，仅本机保存，不会上云。
- **导出 PNG 海报**：以原图生成可收藏的拼贴画面，浏览器本地处理，不上传照片。
- **完整摄影展**：杂志式不规则排版与整齐网格两种模式、香山/颐和园筛选、点开大图、左右翻页、自动播放、照片故事。
- **四季影像篇章**：春、夏、秋、冬封面；现仅秋季有真实作品，其他季节是待收录空白章节。点击季节可切换整站配色与动态气氛。
- **四季动态**：落叶、初雪、花瓣、夏叶的原创 Canvas 动画，可暂停或调整浓度。支持低动态偏好。
- **响应式**：手机、平板、桌面浏览器可用；触摸拖动及键盘方向键微调拼贴。
- **本地临时加图**：仅当次浏览器会话预览，不会写入 GitHub。

## 项目结构

```text
index.html                 主页面、拼贴工作台、四季封面
css/style.css              视觉与响应式样式
js/app.js                  画廊、季节动画与灯箱
js/magazine.js             拖动排版、本地保存、PNG 导出
data/gallery.js            作品清单及叙事文案
assets/photos/             五张原始照片及五张缩略图
assets/favicon.svg         图标
docs/ADDING_PHOTOS.md      添加照片说明
```

## 添加未来季节作品

照片放在 `assets/photos/`，并在 `data/gallery.js` 中新增对象。可选字段 `season` 设为 `spring`、`summer`、`autumn` 或 `winter`；老照片默认归入 `autumn`。

新图正式收录后，别忘了更新相关叙事文字、章节和首页照片数量。拼贴工作台为了保持一期封面排版，目前固定采用前五张照片；完整摄影展可以展示更多条目。

详见 [docs/ADDING_PHOTOS.md](docs/ADDING_PHOTOS.md)。

## 技术和隐私

原生 HTML/CSS/JavaScript、无外部服务依赖。照片只作为网站静态文件展示；PNG 在浏览器 Canvas 本地生成。请勿在未经作者许可的情况下转载照片。
