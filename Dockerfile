# 使用極輕量級的 Nginx Alpine 映像檔
FROM nginx:alpine

# 設定預設 Port 與 Nginx 變數篩選器 (防止 envsubst 覆寫 Nginx 自身的 $uri 變數)
ENV PORT=8080
ENV NGINX_ENVSUBST_FILTER=PORT

# 複製自訂的 Nginx 模板檔到容器的 templates 目錄下
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# 複製靜態網頁檔案到 Nginx 預設網頁目錄
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/

# 暴露 8080 端口
EXPOSE 8080

# 啟動 Nginx 伺服器
CMD ["nginx", "-g", "daemon off;"]
