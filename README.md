# The Last Golden Days · 北京四季影像馆 🍁

一个从 **Beijing Farewell Diary** 独立出来的、桌面优先的私人摄影画廊。记录 2026 年 11 月 10 日的香山与颐和园，收录 5 张真实拍摄照片。

## 预览与技术

- **打开方式：** 把本仓库下载/解压后，直接双击 `index.html`，Chrome / Edge / Safari 均可查看。也可以使用 VS Code Live Server。
- **部署方式：** 原生 HTML + CSS + JavaScript + 本地 JPG，**不需要 npm、Node、数据库、API 密钥或 CDN**。可直接部署到 GitHub Pages。
- **推荐体验：** 电脑浏览器 1440px 及以上，手机也会自动排版。
- **原创交互：** Canvas 程序化叶片/雪花/花瓣/绿叶动画，季节切换、粒子密度、动画暂停、照片筛选、双布局、全屏灯箱、键盘/触摸翻页、自动播放、章节叙事。
- **无障碍：** 支持键盘焦点、语义化图像描述与 `prefers-reduced-motion` 低动态偏好。

## 目录结构

```text
Beijing_Golden_Seasons_Gallery/
├── index.html               # 画廊首页
├── css/style.css            # 原创布局、颜色及动画
├── js/app.js                # 粒子效果、照片墙与灯箱交互
├── data/gallery.js          # 照片信息（新照片改这里）
├── assets/
│   ├── favicon.svg
│   └── photos/
│       ├── 01-qinzhengdian.jpg
│       ├── 01-qinzhengdian-thumb.jpg
│       └── ... 其余照片和缩略图
├── docs/ADDING_PHOTOS.md   # 添加新作品的中文说明
├── .nojekyll
└── README.md
```

## 上传 GitHub Pages

1. 在 GitHub 新建一个 Repository，建议仓库名 `beijing-golden-seasons`。
2. 把 ZIP **解压后的文件和文件夹**上传到仓库**根目录**，确保仓库最外层就有 `index.html`（不要多套一层目录）。
3. 打开仓库 `Settings → Pages`，在 **Build and deployment** 选择 **Deploy from a branch**。
4. Branch 选择 `main`，目录选 `/(root)`，保存。
5. 发布成功后，访问：`https://你的用户名.github.io/beijing-golden-seasons/`。

GitHub 官方文档：https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## 后续添加照片

参见 [docs/ADDING_PHOTOS.md](docs/ADDING_PHOTOS.md)。网页上的「暂时放进几张新照片」按钮**仅提供本地临时预览**，并不会上传或自动保存到 GitHub；正式收录仍需把照片加入 `assets/photos/`，并在 `data/gallery.js` 中添加条目。

## 关于设计灵感与版权

- 参考过 tsParticles 的粒子场设计、PhotoSwipe 的灯箱交互和 GSAP 动画画廊的滚动编排思路，但本站的前端结构、粒子渲染和灯箱逻辑均为**独立编写**，未复制上述仓库代码。
- 照片由画廊主人拍摄提供。未经其许可请勿再次使用或转载照片。
- 字体使用浏览器系统自带的中文宋体/衬线字体及无衬线字体，核心页面没有外部字体下载依赖。

**一句话**：*The Colors I Came For. The Sunset I Stayed For.*
