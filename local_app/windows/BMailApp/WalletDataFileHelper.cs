using Newtonsoft.Json;
using Serilog;
using System.IO;
using System.Text;

namespace BMailApp
{

    /// <summary>
    /// 提供 WalletData 的解析、保存和加载方法
    /// </summary>
    public static class WalletDataFileHelper
    {
        public static readonly string AttachmentFolderName = "BMailAttachments";

        public static string GetOrCreateTargetDir()
        {
            // 获取当前用户的 Documents 目录
            string documentsDir = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            string targetDir = Path.Combine(documentsDir, AttachmentFolderName);

            // 如果目录不存在，创建它
            if (!Directory.Exists(targetDir))
            {
                Log.Information("------>>> 创建目录: {targetDir}", targetDir);
                Directory.CreateDirectory(targetDir);
            }

            return targetDir;
        }

        /// <summary>
        /// 从 JSON 字符串中解析出 WalletData 对象
        /// </summary>
        /// <param name="jsonString">包含 JSON 数据的字符串</param>
        /// <returns>解析成功返回 WalletData，否则抛出异常</returns>
        public static WalletData ParseWalletData(string jsonString)
        {
            if (string.IsNullOrWhiteSpace(jsonString))
            {
                throw new ArgumentException("JSON 字符串为空");
            }

            var walletData = JsonConvert.DeserializeObject<WalletData>(jsonString);

            if (walletData == null)
            {
                throw new InvalidOperationException("无法解析 JSON 为 WalletData 对象");
            }

            return walletData;
        }


        /// <summary>
        /// 将 WalletData 对象保存到应用程序数据目录下
        /// </summary>
        /// <param name="walletData">要保存的 WalletData 对象</param>
        public static void SaveWalletDataToFile(WalletData walletData)
        {
            var json = JsonConvert.SerializeObject(walletData, Formatting.Indented);

            // 获取系统 Application Data 目录（例如：C:\Users\用户名\AppData\Roaming）
            string appDataDir = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            Log.Information("------>>> 钱包目录: {appDataDir}", appDataDir);

            // 拼接目标目录
            string targetDir = Path.Combine(appDataDir, WalletConstants.AppShareDir);
            if (!Directory.Exists(targetDir))
            {
                Directory.CreateDirectory(targetDir);
            }

            // 拼接文件路径
            string filePath = Path.Combine(targetDir, WalletConstants.WalletFile);

            // 将 JSON 数据写入文件
            File.WriteAllText(filePath, json, Encoding.UTF8);

            Log.Information("------>>> 钱包数据已保存到: {filePath}", filePath);
        }

        /// <summary>
        /// 从应用程序数据目录下加载钱包数据
        /// </summary>
        /// <returns>解析成功返回 WalletData，否则抛出异常</returns>
        public static WalletData? LoadBmailWallet()
        {
            // 获取 Application Data 目录
            string appDataDir = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);

            // 拼接目标目录和文件路径
            string targetDir = Path.Combine(appDataDir, WalletConstants.AppShareDir);
            string filePath = Path.Combine(targetDir, WalletConstants.WalletFile);

            if (!File.Exists(filePath))
            {
                return null;
            }

            // 读取文件数据
            string json = File.ReadAllText(filePath, Encoding.UTF8);

            // 解析 JSON 数据
            WalletData? walletData = JsonConvert.DeserializeObject<WalletData>(json);

            return walletData;
        }

    }
}
