#!/bin/bash
# 获取脚本所在的绝对目录
BASE_DIR=$(cd "$(dirname "$0")" && pwd)
echo "=======>>>> Base directory: $BASE_DIR"

rm -f "$BASE_DIR/bin/BMailApp_Installer.pkg"

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

# 2.1 验证 BMailApp.pkg 内部结构（可选）
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

# 3.1 验证 BMailApp_tmp.pkg 内部结构（可选）
pkgutil --expand "$BASE_DIR/BMailApp_tmp.pkg" "$BASE_DIR/BMailApp_tmp_Expanded"
tree "$BASE_DIR/BMailApp_tmp_Expanded"
echo "=======>>>> 查看 BMailApp_tmp_Expanded/Distribution 中的 install-location："
grep "install-location" "$BASE_DIR/BMailApp_tmp_Expanded/Distribution"
rm -rf "$BASE_DIR/BMailApp_tmp_Expanded"

# 4. （原 Step 4：因不需要重命名 Payload，所以跳过此步）

# 5. 使用 productsign 对 BMailApp_tmp.pkg 进行签名，输出文件为 BMailApp_Installer.pkg
echo "=======>>>> Step 5: 使用 productsign 签名..."
productsign --sign "Developer ID Installer: Yushian (Beijing) Technology Co., Ltd. (2XYK8RBB6M)" \
            "$BASE_DIR/BMailApp_tmp.pkg" \
            "$BASE_DIR/BMailApp_Installer.pkg"
if [ $? -ne 0 ]; then
    echo "Error: productsign 签名失败"
    exit 1
fi

# 6. 删除临时包 BMailApp_tmp.pkg（可选）
echo "=======>>>> Step 6: 删除临时包 BMailApp_tmp.pkg..."
rm -f "$BASE_DIR/BMailApp_tmp.pkg"
rm -f "$BASE_DIR/BMailApp.pkg"

# 7. 将生成的 pkg 文件移动到 bin 目录（与 Payload 同级），以避免安装测试时本地 Payload 干扰
echo "=======>>>> Step 7: 将生成的 pkg 文件移动到 bin 目录..."
# 如果 bin 目录不存在，则创建之
if [ ! -d "$BASE_DIR/bin" ]; then
    mkdir "$BASE_DIR/bin"
fi
mv "$BASE_DIR/BMailApp_Installer.pkg" "$BASE_DIR/bin/"

echo "=======>>>> 完成！请使用 $BASE_DIR/bin/BMailApp_Installer.pkg 进行安装。"
