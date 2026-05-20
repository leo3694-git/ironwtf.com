# 極致像素 - 影像彈跳球打磚塊 | Pixel Image Breaker

這是一個基於 HTML5 Canvas、Node.js Express、與 Firebase Realtime Database 打造的**極致像素影像打磚塊遊戲**。

遊戲會將資料夾中的 3 張圖片動態切割為關卡網格磚塊。球打到哪裡，哪裡的圖片像素就會消失並露出底部的黑色。同時，擊碎磚塊時會自動擷取圖片該處的平均顏色，並噴射出相同色澤的絢麗動態粒子！

---

## 🌟 遊戲核心特色
* 🎨 **動態影像磚塊**：三張關卡圖片對應三個關卡，在 HTML5 Canvas 中做局部裁剪（Cropping）繪製成磚塊。
* 💥 **像素彩色粒子特效**：撞擊時擷取圖像該像素的實際顏色，噴發出專屬色彩的跳躍微粒。
* 💊 **驚喜道具機制**：包含 **⭐ 三倍彈珠（Multi-ball）**、**↔️ 擋板增長（Expand Paddle）** 與 **⏰ 彈珠慢速（Slow-motion）** 道具，遊戲性大增。
* 🏆 **全球英雄榜**：串接 Firebase Realtime Database，即時同步全球玩家暱稱、關卡與分數排行。
* 🔌 **無痛相容性（Mock DB）**：若未設定 Firebase 金鑰，程式會**自動降級至本地記憶體模擬資料庫**，確保您在本機試玩與展示時 100% 順暢不報錯！

---

## 🚀 快速開始（本地運行）

### 1. 安裝依賴項目
在專案根目錄中，使用終端機安裝 Node.js 套件：
```bash
npm install
```

### 2. 啟動伺服器
```bash
npm start
```
啟動後終端機會顯示：
```text
==================================================
  IMAGE BRICK BREAKER SERVER IS ONLINE
  Running on http://localhost:8080
  Mode: Local Mock Database (或 Firebase Database)
==================================================
```

### 3. 開始遊玩
打開瀏覽器訪問 `http://localhost:8080`，輸入您的暱稱，即可選擇關卡開始體驗！

---

## 📂 專案檔案結構
```text
/official
├── public/
│   ├── index.html        # 前端 UI（大廳、關卡選擇、排行榜與 Canvas 容器）
│   ├── style.css         # 現代毛玻璃風格（Glassmorphism）、微交互與鍵盤鍵帽樣式
│   ├── game.js           # 物理引擎、碰撞判定、粒子渲染、音效合成與 API 串接
│   └── images/           # 儲存關卡圖片（level1.jpg, level2.jpg, level3.jpg）
├── server.js             # Express 伺服器與 Firebase Admin SDK 初始化邏輯
├── package.json          # Node 專案設定與套件依賴項
├── Dockerfile            # 用於 Google Cloud Run 的輕量化多階段容器設定
├── .gitignore            # 排除 node_modules 與金鑰檔案（防止意外上傳）
└── README.md             # 本導覽說明文件
```

---

## 🛡️ 設定 Firebase Realtime Database
若要將排行分數永久保存，請設定 Firebase：

1. 登入 [Firebase Console](https://console.firebase.google.com/)。
2. 建立新專案，並在左側選單點擊 **Realtime Database**，按步驟「建立資料庫」（伺服器位置選取即可，安全性規則可先選「測試模式」，或之後設定為寫入權限）。
3. 進入專案設定（左上角齒輪） -> **服務帳戶 (Service Accounts)**。
4. 點擊 **產生新的私密金鑰 (Generate New Private Key)**，會下載一個 `.json` 檔案。
5. **本地開發**：將此 JSON 檔案重新命名為 `serviceAccountKey.json` 並放置於本專案根目錄（`.gitignore` 已經為您設定自動忽略此檔案，請放心不會推送到 GitHub）。
6. 重新啟動伺服器，您會看到 Mode 變更為：`Mode: Firebase Database`，即代表串接成功！

---

## ☁️ 部署至 Google Cloud Run

Cloud Run 非常適合運行這個 Express + 靜態網頁容器。我們提供了專屬的 `Dockerfile`，您可以依照以下步驟部署：

### 步驟 1：建置與推送 Docker 映像檔
請確保您的本機已安裝 [Google Cloud CLI](https://cloud.google.com/sdk) 並登入。

在根目錄執行（將 `PROJECT_ID` 替換為您的 GCP 專案 ID）：
```bash
# 啟用 Artifact Registry 與 Cloud Build 服務
gcloud services enable artifactregistry.googleapis.com cloudbuild.googleapis.com run.googleapis.com

# 使用 Cloud Build 在雲端建置並儲存 Image
gcloud builds submit --tag gcr.io/PROJECT_ID/image-brick-breaker:v1
```

### 步驟 2：安全地部署至 Cloud Run (同時設定 Firebase 金鑰)
為了防止金鑰外洩，建議將 `serviceAccountKey.json` 的內容轉為**一整行 JSON 字串**，並以環境變數 `FIREBASE_SERVICE_ACCOUNT_KEY` 形式注入 Cloud Run 中：

1. 將您的 `serviceAccountKey.json` 內容轉化為單行（去換行）字串。
2. 執行以下 Cloud Run 部署命令：
```bash
gcloud run deploy image-brick-breaker \
  --image gcr.io/PROJECT_ID/image-brick-breaker:v1 \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-env-vars="FIREBASE_SERVICE_ACCOUNT_KEY='你的整行JSON金鑰內容'"
```
部署完成後，GCP 會直接提供給您一個 HTTPS 專屬網址，即可分享給全球玩家一起 PK 了！

---

## 🐈 提交至 GitHub
本專案已自動設定好 `.gitignore`。要將程式碼提交到您個人的 GitHub 倉庫中，只需執行：
```bash
git init
git add .
git commit -m "feat: init premium image brick breaker game with firebase rtdb"
git branch -M main
git remote add origin https://github.com/您的帳號/您的倉庫名.git
git push -u origin main
```
> **注意**：絕對不要將含有私鑰密碼的 `serviceAccountKey.json` 提交到 GitHub 上！

祝您遊戲體驗愉快，寫代碼順利！有任何調整需求隨時告訴我！🎮✨
