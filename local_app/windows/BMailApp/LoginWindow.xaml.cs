using System.Windows;

namespace BMailApp
{
    public partial class LoginWindow : Window
    {
        private WalletDataStore walletStore;

        public LoginWindow()
        {
            InitializeComponent();
            walletStore = new WalletDataStore();
        }

        private async void Window_Loaded(object sender, RoutedEventArgs e)
        {
            // 异步加载钱包数据，并更新界面显示
            await walletStore.LoadWalletDataAsync((walletData) =>
            {
                Dispatcher.Invoke(() =>
                {
                    if (walletData != null && walletData.Address != null)
                    {
                        BmailAddressTextBlock.Text = walletData.Address.BmailAddress;
                    }
                });
            });
        }

        private async void LoginButton_Click(object sender, RoutedEventArgs e)
        {
            // 检查是否已经加载钱包数据
            if (walletStore.WalletData == null)  // 修正为 WalletData（首字母大写）
            {
                MessageBox.Show("请先登录BMail浏览器插件", "登录失败", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            // 禁用输入并显示加载遮罩
            SetLoadingState(true);

            string password = PasswordBox.Password;

            try
            {
                // 异步解锁钱包
                await Task.Run(() =>
                {
                    System.Threading.Thread.Sleep(1000);
                    walletStore.UnlockWallet(password);
                });

                // 登录成功后，打开主界面
                MainWindow mainWindow = new MainWindow();
                mainWindow.Show();
                this.Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show("请检查 BMail 地址和密码是否正确: " + ex.Message, "登录失败", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                SetLoadingState(false);
            }
        }

        private void SetLoadingState(bool isLoading)
        {
            if (isLoading)
            {
                LoadingOverlay.Visibility = Visibility.Visible;
                MainContent.IsEnabled = false;
            }
            else
            {
                LoadingOverlay.Visibility = Visibility.Collapsed;
                MainContent.IsEnabled = true;
            }
        }
    }
}
