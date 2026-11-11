# 以后如何加入新照片？

这是一个静态仓库，所以**没有后台服务器，也不会自动上传你选择的照片**。这反而很适合私人作品集：照片由你决定什么时候正式发布。

## 最简单的方法

1. 把新照片发给 ChatGPT，告诉我拍摄地点、日期（不知道也没关系），以及你喜欢的故事。
2. 我会帮你选图、做 JPG 压缩、制作缩略图、安排到合适章节，并更新 `data/gallery.js`。
3. 你只要把我给的更新文件上传到同一个 GitHub 仓库。

## 如果想自己添加

1. 将照片保存到 `assets/photos/`，例如 `06-ditan-ginkgo.jpg`；另备一张 `06-ditan-ginkgo-thumb.jpg`（可用同一张图片，建议缩略图宽度在 900px 内）。
2. 打开 `data/gallery.js`，在 `window.GOLDEN_PHOTOS` 数组末尾加一个对象，参考：

```js
{
  id: 'ditan-ginkgo',
  number: '06',
  date: '2026.11.15',
  place: 'ditan',
  placeName: '地坛 · 银杏大道',
  title: '落在脚边的金色',
  en: 'Golden footsteps',
  image: './assets/photos/06-ditan-ginkgo.jpg',
  thumb: './assets/photos/06-ditan-ginkgo-thumb.jpg',
  alt: '阳光穿过金色的银杏树叶',
  note: '这一刻，北京像一封金色的信。',
  story: '写一点那天的故事……'
}
```

3. 如需让新地点显示在筛选器里，在 `index.html` 的 `.filters` 区域添加一个按钮：

```html
<button class="filter" type="button" data-filter="ditan" aria-pressed="false">地坛 <span>01</span></button>
```

4. 提交变更到 `main` 分支；GitHub Pages 随后会更新。

## 小提醒

- `index.html` 放在仓库根目录。
- 多数 iPhone HEIC 原图建议转换为 JPEG 或 WebP 后再放入仓库。
- 每张展示图最好控制在 1–2 MB 内，兼顾清晰度与加载速度。
- 文件名建议英文短横线，不含空格，避免大小写错配。
- 在浏览器里临时添加的照片只用于预览。刷新页面或换设备后，临时预览就没了。
- 拍到的人像或敏感信息准备公开前，请先征得许可或遮挡处理。
