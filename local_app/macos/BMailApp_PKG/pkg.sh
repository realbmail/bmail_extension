#!/bin/bash
# 获取脚本所在的绝对目录
BASE_DIR=$(cd "$(dirname "$0")" && pwd)
echo "=======>>>> Base directory: $BASE_DIR"

# 清理所有可能残留文件
rm -rf "$BASE_DIR/BMailApp.pkg" \
       "$BASE_DIR/BMailApp_tmp.pkg" \
       "$BASE_DIR/bin/BMailApp_Installer.pkg" \
       "$BASE_DIR/BMailApp_Expanded" \
       "$BASE_DIR/BMailApp_tmp_Expanded" \
       "$BASE_DIR/Expanded"

# 1. 检查 Payload 目录结构是否正确
echo "=======>>>> Step 1: 检查 Payload 目录结构..."
if [ ! -d "$BASE_DIR/Payload/Applications/BMailApp.app" ]; then
    echo "Error: BMailApp.app 必须放置在 Payload/Applications/ 目录下"
    exit 1
fi

# 2. 复制 Payload 到临时目录（避免路径干扰）
echo "=======>>>> Step 2: 复制 Payload 到临时目录..."
TMP_PAYLOAD_DIR=$(mktemp -d "$BASE_DIR/tempPayload.XXXXXX")
cp -R "$BASE_DIR/Payload" "$TMP_PAYLOAD_DIR/"
echo "临时 Payload 目录：$TMP_PAYLOAD_DIR/Payload"

# 3. 禁用 postinstall 脚本（测试阶段）
if [ -f "$BASE_DIR/Scripts/postinstall" ]; then
    echo "=======>>>> Step 3: 禁用 postinstall 脚本进行测试..."
    mv "$BASE_DIR/Scripts/postinstall" "$BASE_DIR/Scripts/postinstall.disabled"
fi

# 4. 使用 pkgbuild 生成组件包
echo "=======>>>> Step 4: 运行 pkgbuild..."
pkgbuild --root "$TMP_PAYLOAD_DIR/Payload" \
         --identifier com.yushian.bmail.pkg \
         --version 1.0 \
         --install-location "/" \
         --component-plist "$BASE_DIR/Components.plist" \
         --scripts "$BASE_DIR/Scripts" \
         "$BASE_DIR/BMailApp.pkg"

if [ $? -ne 0 ]; then
    echo "Error: pkgbuild 生成失败"
    rm -rf "$TMP_PAYLOAD_DIR"
    exit 1
fi

# 清理临时目录
rm -rf "$TMP_PAYLOAD_DIR"

# 5. 验证生成的组件包结构
pkgutil --expand "$BASE_DIR/BMailApp.pkg" "$BASE_DIR/BMailApp_Expanded"
tree "$BASE_DIR/BMailApp_Expanded"
echo "=======>>>> 检查 PackageInfo 中的 install-location："
grep "install-location" "$BASE_DIR/BMailApp_Expanded/PackageInfo"
rm -rf "$BASE_DIR/BMailApp_Expanded"

# 6. 使用 productbuild 生成安装包
echo "=======>>>> Step 6: 运行 productbuild..."
productbuild --distribution "$BASE_DIR/distribution.xml" \
             --package-path "$BASE_DIR" \
             "$BASE_DIR/BMailApp_tmp.pkg"
if [ $? -ne 0 ]; then
    echo "Error: productbuild 生成失败"
    exit 1
fi

# 7. 签名安装包
echo "=======>>>> Step 7: 使用 productsign 签名..."
productsign --sign "Developer ID Installer: Yushian (Beijing) Technology Co., Ltd. (2XYK8RBB6M)" \
            "$BASE_DIR/BMailApp_tmp.pkg" \
            "$BASE_DIR/BMailApp_Installer.pkg"
if [ $? -ne 0 ]; then
    echo "Error: productsign 签名失败"
    exit 1
fi

# 8. 清理临时文件
rm -f "$BASE_DIR/BMailApp_tmp.pkg" \
      "$BASE_DIR/BMailApp.pkg"

# 9. 移动最终安装包到 bin 目录
mkdir -p "$BASE_DIR/bin"
mv "$BASE_DIR/BMailApp_Installer.pkg" "$BASE_DIR/bin/"

# 10. 还原 postinstall 脚本
if [ -f "$BASE_DIR/Scripts/postinstall.disabled" ]; then
    echo "=======>>>> Step 10: 还原 postinstall 脚本..."
    mv "$BASE_DIR/Scripts/postinstall.disabled" "$BASE_DIR/Scripts/postinstall"
fi

# 11. 最终验证
echo "=======>>>> 完成！验证安装包结构："
pkgutil --expand "$BASE_DIR/bin/BMailApp_Installer.pkg" "$BASE_DIR/Expanded"
tree "$BASE_DIR/Expanded"