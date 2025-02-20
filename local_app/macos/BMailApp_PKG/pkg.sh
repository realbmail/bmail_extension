#!/bin/bash
# 获取脚本所在的绝对目录
BASE_DIR=$(cd "$(dirname "$0")" && pwd)
echo "=======>>>> Base directory: $BASE_DIR"

# 1. 检查 Payload 目录结构是否正确（即 Payload/Applications/BMailApp.app 存在）
echo "=======>>>> Step 1: 检查 Payload 目录结构..."
if [ ! -d "$BASE_DIR/Payload/Applications/BMailApp.app" ]; then
    echo "Error: BMailApp.app 未放置在 Payload/Applications/ 目录下"
    exit 1
fi

# 2. 使用 pkgbuild 生成组件包 BMailApp.pkg
echo "=======>>>> Step 2: 运行 pkgbuild..."
pkgbuild --root "$BASE_DIR/Payload" \
         --identifier com.yushian.bmail.pkg \
         --version 1.0 \
         --install-location "/" \
         --scripts "$BASE_DIR/Scripts" \
         "$BASE_DIR/BMailApp.pkg"
if [ $? -ne 0 ]; then
    echo "Error: pkgbuild 生成失败"
    exit 1
fi

# 2.1 验证 BMailApp.pkg 内部结构
pkgutil --expand "$BASE_DIR/BMailApp.pkg" "$BASE_DIR/BMailApp_Expanded"
tree "$BASE_DIR/BMailApp_Expanded"
echo "=======>>>> 查看 BMailApp_Expanded/PackageInfo 中的 install-location："
grep "install-location" "$BASE_DIR/BMailApp_Expanded/PackageInfo"
rm -rf "$BASE_DIR/BMailApp_Expanded"

# 3. 使用 productbuild 生成临时安装包 BMailApp_tmp.pkg
echo "=======>>>> Step 3: 运行 productbuild 生成临时安装包..."
productbuild --distribution "$BASE_DIR/distribution.xml" \
             --package-path "$BASE_DIR" \
             "$BASE_DIR/BMailApp_tmp.pkg"
if [ $? -ne 0 ]; then
    echo "Error: productbuild 生成失败"
    exit 1
fi

# 3.1 验证 BMailApp_tmp.pkg 内部结构
pkgutil --expand "$BASE_DIR/BMailApp_tmp.pkg" "$BASE_DIR/BMailApp_tmp_Expanded"
tree "$BASE_DIR/BMailApp_tmp_Expanded"
echo "=======>>>> 查看 BMailApp_tmp_Expanded/Distribution 中的 install-location："
grep "install-location" "$BASE_DIR/BMailApp_tmp_Expanded/Distribution"
rm -rf "$BASE_DIR/BMailApp_tmp_Expanded"

# 4. 为避免安装时直接引用本地的 Payload 文件，将 Payload 目录重命名（或移动）出去
echo "=======>>>> Step 4: 重命名 Payload 目录以避免直接引用本地文件..."
mv "$BASE_DIR/Payload" "$BASE_DIR/Payload_backup"

# 5. 使用 productsign 对 BMailApp_tmp.pkg 进行签名，输出文件为 BMailApp_Installer.pkg
echo "=======>>>> Step 5: 使用 productsign 签名..."
productsign --sign "Developer ID Installer: Yushian (Beijing) Technology Co., Ltd. (2XYK8RBB6M)" \
            "$BASE_DIR/BMailApp_tmp.pkg" \
            "$BASE_DIR/BMailApp_Installer.pkg"
if [ $? -ne 0 ]; then
    echo "Error: productsign 签名失败"
    exit 1
fi

# 6. 如果需要恢复 Payload 目录供后续使用，可以将其恢复到其他目录，但安装测试时请确保构建目录中无 Payload
# echo "=======>>>> Step 6: 恢复 Payload 目录..."
# mv "$BASE_DIR/Payload_backup" "$BASE_DIR/Payload"

# 7. 删除临时包 BMailApp_tmp.pkg（可选）
echo "=======>>>> Step 7: 删除临时包 BMailApp_tmp.pkg..."
rm -f "$BASE_DIR/BMailApp_tmp.pkg"

echo "=======>>>> 完成！请使用生成的 $BASE_DIR/BMailApp_Installer.pkg 进行安装。"
