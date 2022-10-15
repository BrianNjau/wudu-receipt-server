:: For Windows 10 and above:
:: Run this file only after first installation of this tool, it will install the dependencies of this tool
:: 初次下载此工具后运行一次即可，目的是安装此工具所需的依赖
:: 注意，内网环境需配置代理，建议断开 SPES 代理，连接公网后运行 setup
chcp 65001
@echo off
npm i -g pnpm && pnpm i
pause
