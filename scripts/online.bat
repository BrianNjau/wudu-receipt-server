chcp 65001
@echo off

:: Open receipt server silently
start cmd /k "npm i -g pnpm >NUL 2>&1 && pnpm -s dlx receipt-server"

:: Open Waiter Portal
cd C:\Program Files\Google\Chrome\Application
start chrome.exe https://catering.hwipg.com/magno/render/ScanOrder__Server_0000000000rZLlUaP9OL/loginPad
