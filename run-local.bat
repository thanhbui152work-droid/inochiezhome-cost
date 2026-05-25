@echo off
title INOCHI EZ HOME - LOCAL RUNNER
:: Thiet lap bang ma Unicode UTF-8 de hien thi tieng Viet co dau neu can
chcp 65001 >nul
cd /d "%~dp0"

echo ===================================================
echo     KHOI DONG UNG DUNG INOCHI EZ HOME (LOCAL)
echo ===================================================
echo Duong dan hien tai: "%~dp0"
echo.

:: 1. Kiem tra file package.json co ton tai khong
if exist "package.json" goto :check_node

echo [LOI] THONG BAO QUAN TRONG:
echo ---------------------------------------------------
echo Khong tim thay file package.json trong thu muc nay!
echo.
echo NGUYEN NHAN PHO BIEN:
echo 1. Ban chua GIAI NEN file ZIP tai ve.
echo    Vui long Click chuot phai vao file .zip, chon [Extract All...] de Giai nen,
echo    sau do vao thu muc da giai nen de chay file run-local.bat.
echo.
echo 2. File package.json bi thieu hoac bi xoa nham.
echo ---------------------------------------------------
echo.
pause
exit /b 1

:check_node
:: 2. Kiem tra Node.js da duoc cai dat chua
node -v >nul 2>nul
if %errorlevel% equ 0 goto :check_node_modules

echo [LOI] May tinh cua ban chua cai dat Node.js!
echo Vui long tai va cai dat Node.js tu trang chu: https://nodejs.org/
echo (Chon ban LTS - khuyen nghi cho moi nguoi dung).
echo Sau khi cai dat xong Node.js, hay chay lai file run-local.bat nay.
echo.
pause
exit /b 1

:check_node_modules
:: 3. Tu dong cai dat thu vien neu chua co node_modules
if exist "node_modules\" goto :start_browser

echo [INFO] Dang tien hanh cai dat cac thu vien can thiet (npm install)...
echo Qui khach vui long cho trong giay lat...
call npm install
if %errorlevel% equ 0 goto :start_browser

echo [LOI] Khong the cai dat thu vien phu tro bang "npm install".
echo Kiem tra ket noi internet hoac quyen Administrator va thu lai.
pause
exit /b 1

:start_browser
:: 4. Tu dong mo trinh duyet mac dinh o dia chi http://localhost:3000
echo [INFO] Dang chuan bi khoi chay trinh duyet tai dia chi http://localhost:3000...
start http://localhost:3000

:: 5. Khoi chay ung dung o cong 3000
echo [INFO] Dang khoi dong may chu phat trien (npm run dev)...
call npm run dev
if %errorlevel% neq 0 (
    echo [LOI] Co loi xay ra khi chay lenh "npm run dev".
    echo Kiem tra xem co ung dung nao khac dang xai cong 3000 khong.
)

pause
