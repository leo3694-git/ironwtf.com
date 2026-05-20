# 極簡美學動態計數器 (Premium Interactive Counter)

一個精心設計的現代化響應式網頁計數器，支援深淺色主題切換、流暢的微動畫效果、鍵盤快捷鍵操控，並導入了基於 Web Audio API 的即時合成微音效，非常適合用於測試、日常記錄與雲端部署練習。

## 🌟 特色亮點

*   **現代美學設計**：採用毛玻璃質感卡片 (Glassmorphism) 與動態背景光源 (Ambient Glow)。
*   **自適應雙主題**：內建深色 (Dark Mode) 與淺色 (Light Mode) 模式切換。
*   **流暢微交互**：數字變動時觸發專屬彈跳特效，按鈕具備實體按壓水波紋回饋。
*   **Web Audio API 合成音效**：純程式碼即時合成按鍵音效（增加、減少、重置、主題切換），無需載入音檔，零延遲。
*   **鍵盤快捷鍵**：支援 `↑` / `+` (增加)、`↓` / `-` (減少) 及 `R` (重設)。
*   **狀態持久化**：自動記錄數值與主題狀態，重整網頁或關閉瀏覽器亦不丟失。
*   **容器化支援**：內建 Docker 與 Nginx 設定，可無縫部署至 Google Cloud Run 等雲端平台。

---

## 🛠️ 本地開發與運行

### 方法 1：直接開啟
直接在檔案瀏覽器中雙擊打開 `index.html` 即可在預設瀏覽器中運行。

### 方法 2：使用 Docker 本地測試
如果您本機已安裝 Docker，可以使用以下指令在本地打包並執行：

1.  **建置 Docker 映像檔**：
    ```bash
    docker build -t premium-counter .
    ```
2.  **啟動容器**（對應本地 8080 端口）：
    ```bash
    docker run -d -p 8080:80 premium-counter
    ```
    打開瀏覽器瀏覽 [http://localhost:8080](http://localhost:8080) 即可測試。

---

## 🚀 Google Cloud Run 部署指引

此專案已配置好 Docker 容器化環境，適合部署至 Google Cloud Run。

### 步驟 1：推送至 GitHub
1.  在 GitHub 上建立一個全新的空儲存庫（Repository）。
2.  在專案根目錄下執行以下指令：
    ```bash
    git init
    git add .
    git commit -m "feat: 建立計數器網頁與雲端部署設定"
    git branch -M main
    git remote add origin <您的GitHub儲存庫網址>
    git push -u origin main
    ```

### 步驟 2：部署至 Cloud Run (最簡單方法)
1.  登入 [Google Cloud Console](https://console.cloud.google.com/)。
2.  搜尋並進入 **Cloud Run** 服務。
3.  點擊 **「建立服務」 (Create Service)**。
4.  選擇 **「從原始碼存放區持續部署」 (Continuously deploy from a repository)**，並點擊 **「設定 Cloud Build」**。
5.  授權並選擇您剛才上傳的 GitHub 儲存庫。
6.  建置組態選擇 **Dockerfile**，路徑填寫 `Dockerfile`。
7.  點擊儲存，Cloud Run 就會自動透過 Cloud Build 幫您將網頁打包並產生專屬的 HTTPS 網址！
