using Newtonsoft.Json;
using System.Text;

namespace BMailApp
{
    public static class NativeMessagingProcessor
    {
        public static void Process()
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
            // 示例：如果命令为 "echo"，则返回原始数据
            if (msg.Command == "echo")
            {
                var responseObj = new
                {
                    status = "success",
                    echo = msg.Data
                };
                return JsonConvert.SerializeObject(responseObj);
            }

            // 根据需要添加更多命令处理逻辑

            // 默认响应：未知命令
            var defaultResponse = new
            {
                status = "success"
            };
            return JsonConvert.SerializeObject(defaultResponse);
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

/*
 

using System.Reflection;
using System.Diagnostics;

// 获取当前程序的完整路径
string exePath = Assembly.GetExecutingAssembly().Location;

ProcessStartInfo psi = new ProcessStartInfo
{
    FileName = exePath,
    Arguments = "--ui", // 传递参数以强制进入 UI 模式
    UseShellExecute = false
};

Process.Start(psi);


 */