# 使用極輕量級的 Nginx Alpine 映像檔
FROM nginx:alpine

# 複製自訂的 Nginx 設定檔到容器內
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 複製靜態網頁檔案到 Nginx 預設網頁目錄
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/

# 暴露 80 端口
EXPOSE 80

# 啟動 Nginx 伺服器
CMD ["nginx", "-g", "daemon off;"]
