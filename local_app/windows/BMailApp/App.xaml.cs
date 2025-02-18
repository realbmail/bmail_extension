using System;
using System.Linq;
using System.Windows;

namespace BMailApp
{
    public partial class App : Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            // 检查命令行参数，如果包含 "--ui"，则强制进入 UI 模式
            bool forceUIMode = e.Args != null && e.Args.Any(arg => arg.Equals("--ui", StringComparison.OrdinalIgnoreCase));

            if (!forceUIMode && Console.IsInputRedirected)
            {
                // Native Messaging 模式：标准输入被重定向且没有 "--ui" 参数
                Console.WriteLine("------>>>应用程序以 Native Messaging 模式启动。");

                try
                {
                    NativeMessagingProcessor.Process();
                    Console.WriteLine("------>>>Native Messaging 消息处理完成，应用程序正常退出。");
                    Environment.Exit(0);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"------>>>Native Messaging 处理过程中发生错误: {ex.Message}");
                    Console.Error.WriteLine(ex.StackTrace);
                    Environment.Exit(1);
                }
            }
            else
            {
                // UI 模式：包括传入了 "--ui" 参数的情况，或者标准输入无有效数据时
                Console.WriteLine("------>>>应用程序以 UI 模式启动。");

                // 调用 base.OnStartup(e) 做默认初始化（可选）
                base.OnStartup(e);

                // 手动创建并显示主窗口
                var mainWindow = new LoginWindow();
                this.MainWindow = mainWindow;
                mainWindow.Show();
            }
        }
    }
}