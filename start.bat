@echo off
chcp 65001 > nul
title ROOH Enterprise Ecosystem - روح لمستحضرات التجميل
echo =======================================================================
echo   👑 تشغيل منظومة روح المتكاملة لمستحضرات التجميل - ROOH Enterprise
echo   المدير العام: إدارة روح لمستحضرات التجميل (01227208589)
echo =======================================================================
cd /d "%~dp0"

set "NODE_CMD=node"
where node >nul 2>nul
if %errorlevel% neq 0 (
  if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_CMD=C:\Program Files\nodejs\node.exe"
  )
)

echo.
echo [1] تشغيل المتجر والموقع ولوحة التحكم على المنفذ: 3000
echo [2] رابط الدخول من الكمبيوتر:
echo     - المتجر والموقع:  http://localhost:3000
echo     - لوحة التحكم:    http://localhost:3000/admin
echo     - تسجيل الدخول:   http://localhost:3000/login
echo.
echo [3] رابط الدخول من الهاتف المحمول (عبر نفس شبكة الواي فاي):
for /f "tokens=4" %%a in ('route print 0.0.0.0 ^| findstr 0.0.0.0 ^| findstr /v "Persistent"') do (
  if not "%%a"=="" (
    echo     - رابط الموبايل للمتجر: http://%%a:3000
    echo     - رابط الموبايل للتحكم: http://%%a:3000/admin
    goto :ip_done
  )
)
:ip_done

echo.
echo =======================================================================
echo جاري فتح المتجر تلقائياً في المتصفح...
start "" "http://localhost:3000"
"%NODE_CMD%" server.js
pause
