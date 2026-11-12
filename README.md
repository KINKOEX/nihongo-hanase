# にほんごで働く！ビジネス日本語30時間 — 互動式課文音檔播放器（Tracks 01–14）

純靜態網頁設計（HTML / CSS / JavaScript），支援雙擊 `index.html` 本機開啟，也可直接上傳至 GitHub 並開啟 **GitHub Pages** 線上使用。

## 檔案結構

```text
nihongo-business-player/
├── index.html      # 主頁面結構
├── styles.css      # 介面樣式（含淺色 / 深色主題、響應式側邊欄）
├── data.js         # 第 01–14 課音檔時間軸、日文原文、漢字假名標音與繁體中文翻譯
├── app.js          # 音檔播放、同步字幕高亮、單句循環與快捷鍵控制
├── README.md       # 說明與 GitHub 部署指引
└── audio/
    ├── 01.mp3
    ├── ...
    └── 14.mp3
```

## 主要功能

- **逐句同步字幕**：播放音檔時自動高亮目前正在朗讀的句子並捲動至中央。
- **點句即播 & 快速跳轉**：點擊任一句字幕立即跳轉至該時間點播放；練習題支援「例 / 1 / 2 / 3 / 4」快速跳轉。
- **單句循環跟讀**：點擊單句上的「🔁 循環」或按 `R` 鍵即可反覆跟讀該句。
- **多元學習輔助**：
  - **ふりがな** 漢字假名標音開關
  - **中文翻譯** 繁體中文翻譯開關
  - **盲聽模式** 隱藏日文字幕，適合聽力測驗（可點擊單句偷看）
  - **語速調整**（0.75× ～ 1.25×）、**自動連播下一課**、**學習進度紀錄**
- **鍵盤快捷鍵**：`Space` 播放/暫停、`←`/`→` 上/下一句、`↑`/`↓` 上/下一課、`R` 單句循環。

## 上傳至 GitHub 並啟用 GitHub Pages

1. 在 GitHub 建立一個新的 Repository（例如 `nihongo-business-player`）。
2. 將本資料夾中的所有檔案（包含 `audio/` 資料夾內的 `01.mp3`～`14.mp3`）推送或上傳到該 Repository：
   ```bash
   git init
   git add .
   git commit -m "Add interactive audio player for tracks 01-14"
   git branch -M main
   git remote add origin https://github.com/<你的帳號>/<repo名稱>.git
   git push -u origin main
   ```
3. 到 GitHub Repository 的 **Settings → Pages**：
   - **Source** 選擇 **Deploy from a branch**
   - **Branch** 選擇 `main` / `/ (root)`，點擊 **Save**
4. 稍候約 1 分鐘即可透過 `https://<你的帳號>.github.io/<repo名稱>/` 開啟互動式網頁。
