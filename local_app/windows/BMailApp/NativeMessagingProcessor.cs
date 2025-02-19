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
            string jsonMessage = ReadNativeMessage();
            if (!string.IsNullOrEmpty(jsonMessage))
            {
                // 反序列化JSON消息
                var nativeMsg = JsonConvert.DeserializeObject<NativeMessage>(jsonMessage);
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
        private static string ReadNativeMessage()
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
                // 如有需要，可记录日志
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
                // 如有需要，可记录日志
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
                        // 处理 moveFile 命令
                        responseObj = new
                        {
                            status = "success",
                            message = "File moved successfully."
                        };
                        break;

                    case "fileKey":
                        // 处理 fileKey 命令
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
            Process process = Process.Start(psi);

            if (process != null)
            {
                Log.Information("------>>> UI 应用程序启动成功, 进程 ID: {ProcessId}", process.Id);
            }
            else
            {
                Log.Warning("------>>> UI 应用程序启动失败: Process.Start 返回 null");
            }

        }

        public static void ProcessWallet(Object jsonData)
        {
            if (jsonData == null)
            {
                Log.Error("------>>>钱包数据为null。");
                throw new ArgumentNullException("wallet data is null");
            }

            string jsonStr = jsonData.ToString();

            Log.Information("------>>> 钱包字符串为：{jsonStr}", jsonStr);

            // 解析 JSON 字符串为 WalletData 对象
            WalletData walletData = JsonConvert.DeserializeObject<WalletData>(jsonStr);

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

    }

    /// <summary>
    /// 用于反序列化来自浏览器扩展的 JSON 消息
    /// </summary>
    public class NativeMessage
    {
        [JsonProperty("command")]
        public string Command { get; set; }

        [JsonProperty("data")]
        public object Data { get; set; }
    }
}
