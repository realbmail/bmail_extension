using System.Windows;

namespace BMailApp
{
    public partial class App : Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            // 如果标准输入被重定向，则认为是 Native Messaging 模式
            if (Console.IsInputRedirected)
            {
                NativeMessagingProcessor.Process();
                Environment.Exit(0);
            }
            // 否则进入 UI 模式
            base.OnStartup(e);
        }
    }
}