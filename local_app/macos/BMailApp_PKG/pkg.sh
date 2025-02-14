#!/bin/bash

# 获取当前脚本所在目录（即 BMailApp_PKG 目录）
BASE_DIR=$(cd "$(dirname "$0")" && pwd)

# 此处的 --root 参数指向 Payload 文件夹，该文件夹中只包含 BMailApp.app
pkgbuild --root "$BASE_DIR/Payload" \
         --identifier com.yushian.bmail.pkg \
         --version 1.0 \
         --scripts "$BASE_DIR/Scripts" \
         "$BASE_DIR/BMailApp.pkg"

# 使用 productbuild 制作最终安装包，distribution.xml 位于当前目录
productbuild --distribution "$BASE_DIR/distribution.xml" \
             --package-path "$BASE_DIR" \
             "$BASE_DIR/BMailApp_Installer.pkg"
