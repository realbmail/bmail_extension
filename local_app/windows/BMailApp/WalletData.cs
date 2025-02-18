using System.IO;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BMailApp
{
    /// <summary>
    /// 常量定义，类似于 Swift 中的 AppShareDir、WalletFile、AttachmentDir
    /// </summary>
    public static class WalletConstants
    {
        public const string AppShareDir = "BMailApp";
        public const string WalletFile = "walletData.json";
        public const string AttachmentDir = "BMailAttachments";
    }

    /// <summary>
    /// 对应 Swift 中的 Address 结构体
    /// </summary>
    public class Address
    {
        [JsonPropertyName("bmail_address")]
        public string BmailAddress { get; set; }

        [JsonPropertyName("eth_address")]
        public string EthAddress { get; set; }
    }

    /// <summary>
    /// 对应 Swift 中的 CipherData 结构体
    /// </summary>
    public class CipherData
    {
        [JsonPropertyName("cipher_txt")]
        public string CipherTxt { get; set; }

        [JsonPropertyName("iv")]
        public string Iv { get; set; }

        [JsonPropertyName("salt")]
        public string Salt { get; set; }

        [JsonPropertyName("key_size")]
        public int KeySize { get; set; }

        [JsonPropertyName("iterations")]
        public int Iterations { get; set; }
    }

    /// <summary>
    /// 对应 Swift 中的 WalletData 结构体
    /// </summary>
    public class WalletData
    {
        [JsonPropertyName("address")]
        public Address Address { get; set; }

        [JsonPropertyName("cipher_data")]
        public CipherData CipherData { get; set; }

        [JsonPropertyName("version")]
        public int Version { get; set; }

        [JsonPropertyName("id")]
        public int Id { get; set; }

        // 这两个属性不参与 JSON 解析，后续解锁钱包时进行赋值
        [JsonIgnore]
        public byte[] PriKey { get; set; }

        [JsonIgnore]
        public byte[] CurvePriKey { get; set; }
    }

    /// <summary>
    /// 提供 WalletData 的解析、保存和加载方法
    /// </summary>
    public static class WalletDataFileHelper
    {
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
            return JsonSerializer.Deserialize<WalletData>(jsonString);
        }

        /// <summary>
        /// 将 WalletData 对象保存到应用程序数据目录下
        /// </summary>
        /// <param name="walletData">要保存的 WalletData 对象</param>
        public static void SaveWalletDataToFile(WalletData walletData)
        {
            // 使用 JsonSerializer 序列化，并设置格式化输出
            var options = new JsonSerializerOptions
            {
                WriteIndented = true
            };
            string json = JsonSerializer.Serialize(walletData, options);

            // 获取系统 Application Data 目录（例如：C:\Users\用户名\AppData\Roaming）
            string appDataDir = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);

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
            Console.WriteLine($"------>>> 钱包数据已保存到: {filePath}");
        }

        /// <summary>
        /// 从应用程序数据目录下加载钱包数据
        /// </summary>
        /// <returns>解析成功返回 WalletData，否则抛出异常</returns>
        public static WalletData LoadBmailWallet()
        {
            // 获取 Application Data 目录
            string appDataDir = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);

            // 拼接目标目录和文件路径
            string targetDir = Path.Combine(appDataDir, WalletConstants.AppShareDir);
            string filePath = Path.Combine(targetDir, WalletConstants.WalletFile);

            if (!File.Exists(filePath))
            {
                return null;
                //throw new FileNotFoundException("钱包数据文件不存在", filePath);
            }

            // 读取文件数据
            string json = File.ReadAllText(filePath, Encoding.UTF8);
            // 解析 JSON 数据
            WalletData walletData = JsonSerializer.Deserialize<WalletData>(json);
            return walletData;
        }
    }
}