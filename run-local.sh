#!/bin/bash

# Dung lai neu gap loi bat ngo
set -e

echo "==================================================="
echo "    KHỞI ĐỘNG ỨNG DỤNG INOCHI EZ HOME (LOCAL)"
echo "==================================================="
echo ""

# Kiem tra Node.js da duoc cai dat chua
if ! command -v node &> /dev/null
then
    echo "[LỖI] Bạn chưa cài đặt Node.js trên máy tính!"
    echo "Vui lòng tải và cài đặt Node.js tại trang chủ: https://nodejs.org/"
    echo "Sau đó chạy lại tệp lệnh này."
    exit 1
fi

# Tu dong cai dat thu vien neu chua co thu muc node_modules
if [ ! -d "node_modules" ]; then
    echo "[INFO] Đang tiến hành cài đặt các thư viện liên kết (npm install)..."
    npm install
fi

# Mat dinh tu dong mo URL phu hop voi He dieu hanh
echo "[INFO] Đang mở trình duyệt tại địa chỉ http://localhost:3000..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:3000"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:3000"
    else
        echo "Vui lòng truy cập thủ công địa chỉ http://localhost:3000"
    fi
else
    # Thiet lap cho Git Bash or environment gia lap khac
    start "http://localhost:3000" || echo "Vui lòng truy cập thủ công địa chỉ http://localhost:3000"
fi

# Chay may chu phu tro du van tin
echo "[INFO] Đang khởi chạy máy chủ phát triển (Dev Server)..."
npm run dev
