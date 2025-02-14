#!/bin/bash
# 获取脚本所在的绝对目录
BASE_DIR=$(cd "$(dirname "$0")" && pwd)
echo "Base directory: $BASE_DIR"

# 检查 Payload 目录结构是否正确（即 Payload/Applications/BMailApp.app 存在）
if [ ! -d "$BASE_DIR/Payload/Applications/BMailApp.app" ]; then
    echo "Error: BMailApp.app 未放置在 Payload/Applications/ 目录下"
    exit 1
fi

# 使用 pkgbuild 生成组件包
# --root 指向 Payload 目录，该目录下包含 Applications/BMailApp.app
# --install-location "/" 意味着 Payload 内的相对路径 "Applications/BMailApp.app" 会安装到 "/Applications/BMailApp.app"
echo "Running pkgbuild..."
pkgbuild --root "$BASE_DIR/Payload" \
         --identifier com.yushian.bmail.pkg \
         --version 1.0 \
         --install-location "/" \
         --scripts "$BASE_DIR/Scripts" \
         "$BASE_DIR/BMailApp.pkg"

if [ $? -ne 0 ]; then
    echo "pkgbuild 生成失败"
    exit 1
fi

# 使用 productbuild 生成最终的安装包
# distribution.xml 中的 pkg-ref 同样指定了 installLocation="/"
echo "Running productbuild..."
productbuild --distribution "$BASE_DIR/distribution.xml" \
             --package-path "$BASE_DIR" \
             "$BASE_DIR/BMailApp_Installer.pkg"

if [ $? -ne 0 ]; then
    echo "productbuild 生成失败"
    exit 1
fi

# 为避免安装时直接引用本地的 Payload 文件，将 Payload 目录重命名（或移动）出去
echo "Renaming Payload directory to avoid direct file reference..."
mv "$BASE_DIR/Payload" "$BASE_DIR/Payload_backup"

echo "完成！请使用生成的 $BASE_DIR/BMailApp_Installer.pkg 进行安装。"
