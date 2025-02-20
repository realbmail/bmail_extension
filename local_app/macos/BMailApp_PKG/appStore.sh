#!/bin/bash
# 获取脚本所在的绝对目录
BASE_DIR=$(cd "$(dirname "$0")" && pwd)
echo "=======>>>> Base directory: $BASE_DIR"

# Step 8: 使用 notarytool 提交安装包进行公证
echo "=======>>>> Step 8: 提交安装包进行公证 (notarytool)..."
xcrun notarytool submit "$BASE_DIR/bin/BMailApp_Installer.pkg" \
    --keychain-profile "MyNotaryProfile" \
    --wait
if [ $? -ne 0 ]; then
    echo "Error: notarytool 提交失败"
    exit 1
fi

# Step 9: 使用 stapler 将公证信息捆绑到安装包中
echo "=======>>>> Step 9: 捆绑公证信息 (stapler)..."
xcrun stapler staple "$BASE_DIR/bin/BMailApp_Installer.pkg"
if [ $? -ne 0 ]; then
    echo "Error: stapler 操作失败"
    exit 1
fi

# Step 10: 使用 pkgutil 检查安装包签名和公证信息
echo "=======>>>> Step 10: 使用 pkgutil 检查安装包签名和公证信息..."
NOTARIZATION_OUTPUT=$(pkgutil --check-signature "$BASE_DIR/bin/BMailApp_Installer.pkg")
echo "$NOTARIZATION_OUTPUT"
if echo "$NOTARIZATION_OUTPUT" | grep -q "Notarization: trusted by the Apple notary service"; then
    echo "=======>>>> Notarization check passed: Package is notarized."
else
    echo "Error: Package is not notarized! Notarization info missing."
    exit 1
fi

echo "=======>>>> 完成！请使用生成的 $BASE_DIR/bin//BMailApp_Installer.pkg 进行安装。"
