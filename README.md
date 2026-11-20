# 平興數資・探索教室

以 Three.js 製作的平興國中數理資優班互動教室。可在桌面或手機探索 3D 場景，從展品進入課程、作品、活動紀事和榮譽榜。

## 在本機啟動

需要 Python 3 與支援 WebGL 的瀏覽器。Three.js 已隨專案提供，網站直接載入 HTML、CSS 與 JavaScript，無需安裝 npm 套件或執行打包。

```sh
git clone https://github.com/ChroHarp/InteractionClassroom.git
cd InteractionClassroom
python -m http.server 8765 --bind 127.0.0.1
```

瀏覽 [教室首頁](http://127.0.0.1:8765/) 或 [課程與作品目錄](http://127.0.0.1:8765/content.html)。JavaScript 模組與資料檔需要透過 HTTP 載入。外部影片及官網連結需要網路。

## 專案結構

- `index.html` 是 3D 教室入口與分享縮圖設定。
- `content.html` 是可獨立瀏覽的課程與作品目錄，也是教室展品的內容來源。
- `assets/classroom/` 放置場景、互動、樣式、本機 Three.js 與已公開的素材。
- `data/classroom/awards.json` 提供榮譽榜資料。

## 發布

使用靜態網站主機，將 `index.html`、`content.html`、`assets/` 和 `data/` 以原有目錄結構發布。上線後，將首頁的 `og:image` 設為縮圖的完整公開 HTTPS 網址，並檢查手機操作及分享預覽。

活動照片、影片和縮圖發布前都應檢查可辨識的人像，包括背景、畫中畫和 3D 場景截圖中的素材。原始檔請保存在版本庫外，公開版本只收錄經檢查的去識別化輸出或無人像替代素材。
