#!/bin/zsh

cd "/Users/apple/Desktop/未命名文件夹/观象-完整产品-working" || exit 1
echo "正在启动观象，请保持此窗口开启……"
npm run dev -- --host 127.0.0.1 --port 3001
