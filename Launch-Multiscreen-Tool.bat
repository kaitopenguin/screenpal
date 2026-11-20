@echo off
title ScreenPal v2.1 (Secondary Display Companion)
cd /d "%~dp0"

if exist "dist\multiscreen-tool-win32-x64\multiscreen-tool.exe" (
    start "" "dist\multiscreen-tool-win32-x64\multiscreen-tool.exe"
) else if exist "node_modules\electron\dist\electron.exe" (
    start "" "node_modules\electron\dist\electron.exe" .
) else (
    call npx.cmd electron .
)
exit
