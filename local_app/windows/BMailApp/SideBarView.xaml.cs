using System.Windows;
using System.Windows.Controls;

namespace BMailApp
{
    public partial class SidebarView : UserControl
    {
        public SidebarView()
        {
            InitializeComponent();
        }

        // 定义 SelectedContent 依赖属性，用于与 MainView 进行绑定
        public static readonly DependencyProperty SelectedContentProperty =
            DependencyProperty.Register("SelectedContent", typeof(ContentType), typeof(SidebarView),
                new PropertyMetadata(ContentType.MailAttachment));

        public ContentType SelectedContent
        {
            get { return (ContentType)GetValue(SelectedContentProperty); }
            set { SetValue(SelectedContentProperty, value); }
        }

        /// <summary>
        /// 当用户点击退出按钮后触发
        /// </summary>
        public event EventHandler? LogoutRequested;

        private void MailAttachmentButton_Click(object sender, RoutedEventArgs e)
        {
            SelectedContent = ContentType.MailAttachment;
        }

        private void SettingsButton_Click(object sender, RoutedEventArgs e)
        {
            SelectedContent = ContentType.Settings;
        }

        private void LogoutButton_Click(object sender, RoutedEventArgs e)
        {
            var result = MessageBox.Show("确定要退出吗？", "确认退出", MessageBoxButton.YesNo, MessageBoxImage.Question);
            if (result == MessageBoxResult.Yes)
            {
                LogoutRequested?.Invoke(this, EventArgs.Empty);
            }
        }
    }
}