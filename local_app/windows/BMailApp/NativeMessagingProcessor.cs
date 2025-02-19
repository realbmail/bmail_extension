using Newtonsoft.Json;
using System.Text;
using System.Reflection;
using System.Diagnostics;
using Serilog;
using System.IO;

namespace BMailApp
{
    public static class NativeMessagingProcessor
    {
        public static void Handle()
        {
            // 按 Native Messaging 协议读取消息：先读取4字节长度，再读取对应的JSON消息体
            string? jsonMessage = ReadNativeMessage();
            if (!string.IsNullOrEmpty(jsonMessage))
            {
                // 反序列化JSON消息
                var nativeMsg = JsonConvert.DeserializeObject<NativeMessage>(jsonMessage);
                if (nativeMsg == null)
                {
                    throw new Exception("read native message is null");
                }
                // 处理消息并生成响应
                string response = ProcessNativeMessage(nativeMsg);
                // 按协议将响应写回标准输出
                WriteNativeResponse(response);
            }
        }

        /// <summary>
        /// 按 Native Messaging 协议从标准输入读取消息：先读取4个字节表示消息长度，再读取对应的JSON消息体
        /// </summary>
        /// <returns>读取到的JSON字符串</returns>
        private static string? ReadNativeMessage()
        {
            try
            {
                var stdIn = Console.OpenStandardInput();
                byte[] lengthBytes = new byte[4];
                int bytesRead = stdIn.Read(lengthBytes, 0, 4);
                if (bytesRead < 4)
                    return null;

                int messageLength = BitConverter.ToInt32(lengthBytes, 0);
                byte[] messageBytes = new byte[messageLength];
                int totalRead = 0;
                while (totalRead < messageLength)
                {
                    int read = stdIn.Read(messageBytes, totalRead, messageLength - totalRead);
                    if (read == 0)
                        break;
                    totalRead += read;
                }
                return Encoding.UTF8.GetString(messageBytes, 0, totalRead);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "------>>> read native message is null");
                return null;
            }
        }

        /// <summary>
        /// 按协议将响应写入标准输出：先写入4字节长度，再写入JSON响应数据
        /// </summary>
        /// <param name="response">响应的JSON字符串</param>
        private static void WriteNativeResponse(string response)
        {
            try
            {
                byte[] responseBytes = Encoding.UTF8.GetBytes(response);
                byte[] lengthBytes = BitConverter.GetBytes(responseBytes.Length);
                var stdOut = Console.OpenStandardOutput();
                stdOut.Write(lengthBytes, 0, lengthBytes.Length);
                stdOut.Write(responseBytes, 0, responseBytes.Length);
                stdOut.Flush();
            }
            catch (Exception ex)
            {
                Log.Error(ex, "------>>> read native message is null");
            }
        }

        /// <summary>
        /// 根据接收到的消息内容处理业务逻辑，并返回响应的JSON字符串
        /// </summary>
        /// <param name="msg">消息对象，包含 command 和 data</param>
        /// <returns>响应的JSON字符串</returns>
        private static string ProcessNativeMessage(NativeMessage msg)
        {
            Log.Information("------>>> 收到 native message: Command = {Command}, Data = {Data}", msg.Command, msg.Data);
            object responseObj;
            try
            {
                switch (msg.Command) // 将 msg.Command 转为小写来避免大小写不一致的问题 .ToLower()
                {
                    case "openApp":
                        // 调用 OpenUIApp 启动 UI 程序
                        OpenUIApp();
                        responseObj = new
                        {
                            status = "success",
                            message = "Application opened successfully."
                        };
                        break;

                    case "sendWallet":
                        // 处理 sendWallet 命令
                        ProcessWallet(msg.Data);
                        responseObj = new
                        {
                            status = "success",
                            message = "Wallet sent successfully."
                        };
                        break;

                    case "moveFile":
                        moveFile(msg.FilePath);
                        responseObj = new
                        {
                            status = "success",
                            message = "File moved successfully."
                        };
                        break;

                    case "fileKey":

                        FileKey(msg.Data, msg.KeyID);
                        
                        responseObj = new
                        {
                            status = "success",
                            message = "File key processed successfully."
                        };
                        break;

                    default:
                        // 处理未知命令
                        responseObj = new
                        {
                            status = "unknown_command",
                            message = "The command is unknown."
                        };
                        break;
                }
            }
            catch (Exception ex)
            {
                Log.Error(ex, "------>>>Native Messaging 处理消息发生错误");
                // 捕获异常并返回错误信息
                responseObj = new
                {
                    status = "error",
                    message = $"An error occurred: {ex.Message}"
                };
            }

            // 序列化响应对象并返回
            return JsonConvert.SerializeObject(responseObj);
        }

        /// <summary>
        /// 启动 UI 应用程序
        /// </summary>
        private static void OpenUIApp()
        {
            // 获取当前程序的完整路径
            //string exePath = Assembly.GetExecutingAssembly().Location;
            string exePath = Path.ChangeExtension(Assembly.GetExecutingAssembly().Location, ".exe");
            Log.Information("------>>> 获取到程序路径: {ExePath}", exePath);

            // 设置启动参数
            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = exePath,
                Arguments = "--ui", // 传递参数以强制进入 UI 模式
                UseShellExecute = false
            };

            // 启动进程
            using Process? process = Process.Start(psi);

            if (process != null)
            {
                Log.Information("------>>> UI 应用程序启动成功, 进程 ID: {ProcessId}", process.Id);
            }
            else
            {
                Log.Warning("------>>> UI 应用程序启动失败: Process.Start 返回 null");
            }

        }

        public static void ProcessWallet(Object? jsonData)
        {
            if (jsonData == null || jsonData.ToString() == null)
            {
                Log.Error("------>>>钱包数据为null。");
                throw new ArgumentNullException("wallet data is null");
            }

            string jsonStr = jsonData.ToString()!;

            Log.Information("------>>> 钱包字符串为：{jsonStr}", jsonStr);

            // 解析 JSON 字符串为 WalletData 对象
            WalletData? walletData = JsonConvert.DeserializeObject<WalletData>(jsonStr);

            if (walletData == null)
            {
                Log.Error("------>>> 无法解析 WalletData，jsonData 无效。");
                throw new ArgumentNullException("wallet data is null");
            }

            // 输出解析后的 WalletData 信息，用于调试
            Log.Information("------>>> 解析 WalletData 成功，版本: {Version}, 钱包 ID: {Id}, 地址: {BmailAddress}, 以太坊地址: {EthAddress}",
                walletData.Version, walletData.Id, walletData.Address.BmailAddress, walletData.Address.EthAddress);

            WalletDataFileHelper.SaveWalletDataToFile(walletData);
        }

        /// <summary>
        /// 处理文件移动逻辑
        /// </summary>
        private static void moveFile(string? filePath)
        {
            if (filePath == null)
            {
                throw new ArgumentNullException("File path is null.");
            }

            // 获取当前用户的 Documents 目录
            string documentsDir = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            string targetDir = Path.Combine(documentsDir, "BMailAttachments");

            // 如果目录不存在，创建它
            if (!Directory.Exists(targetDir))
            {
                Directory.CreateDirectory(targetDir);
            }

            // 获取目标文件的文件名
            string fileName = Path.GetFileName(filePath);
            string targetFilePath = Path.Combine(targetDir, fileName);

            // 移动文件到目标目录，保留文件名
            if (File.Exists(filePath))
            {
                File.Move(filePath, targetFilePath);
                Log.Information("------>>> 文件移动成功: {FileName}", fileName);
            }
            else
            {
                throw new FileNotFoundException($"文件 {filePath} 不存在");
            }
        }

        /// <summary>
        /// 处理文件键操作逻辑
        /// </summary>
        /// <summary>
        /// 处理文件键操作逻辑
        /// </summary>
        private static void FileKey(object? data, string? id)
        {
            if (data == null || id == null)
            {
                throw new ArgumentNullException("Data or ID is null.");
            }

            // 创建文件名
            string fileName = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "BMailAttachments", "." + id);

            // 如果文件已存在，不做处理
            if (File.Exists(fileName))
            {
                Log.Information("------>>> 文件已存在，跳过创建: {FileName}", fileName);
                return;
            }

            // 如果文件不存在，创建并写入内容
            File.WriteAllText(fileName, data.ToString());
            Log.Information("------>>> 文件已创建并写入数据: {FileName}", fileName);
        }

    }

    /// <summary>
    /// 用于反序列化来自浏览器扩展的 JSON 消息
    /// </summary>
    public class NativeMessage
    {
        [JsonProperty("command")]
        public required string Command { get; set; }

        [JsonProperty("data")]
        public object? Data { get; set; }

        [JsonProperty("filePath")]
        public string? FilePath { get; set; }

        [JsonProperty("id")]
        public string? KeyID { get; set; }
    }
}
