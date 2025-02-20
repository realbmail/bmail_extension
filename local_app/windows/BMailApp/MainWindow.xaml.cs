using System;
using System.ComponentModel;
using System.Windows;
using System.Windows.Controls;

namespace BMailApp
{
    public partial class MainWindow : Window, INotifyPropertyChanged
    {
        private ContentType selectedContent = ContentType.MailAttachment;
        public event PropertyChangedEventHandler? PropertyChanged;

        /// <summary>
        /// 当前选中的内容类型，默认为 MailAttachment
        /// </summary>
        public ContentType SelectedContent
        {
            get => selectedContent;
            set
            {
                if (selectedContent != value)
                {
                    selectedContent = value;
                    OnPropertyChanged(nameof(SelectedContent));
                    UpdateContent();
                }
            }
        }

        public MainWindow()
        {
            InitializeComponent();
            DataContext = this;
            // 默认选中 MailAttachment
            SelectedContent = ContentType.MailAttachment;
        }

        protected void OnPropertyChanged(string propertyName) =>
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));

        /// <summary>
        /// 根据选中类型更新右侧内容区域
        /// </summary>
        private void UpdateContent()
        {
            switch (SelectedContent)
            {
                case ContentType.MailAttachment:
                    ContentArea.Content = new MailAttachmentView();
                    break;
                case ContentType.Settings:
                    ContentArea.Content = new SettingView();
                    break;
                case ContentType.None:
                default:
                    ContentArea.Content = new TextBlock
                    {
                        Text = "请选择功能",
                        HorizontalAlignment = HorizontalAlignment.Center,
                        VerticalAlignment = VerticalAlignment.Center,
                        FontSize = 20
                    };
                    break;
            }
        }

        /// <summary>
        /// 窗口加载时调整窗口大小（1200×800，居中显示）
        /// </summary>
        private void Window_Loaded(object sender, RoutedEventArgs e)
        {
            this.Width = 1200;
            this.Height = 800;
            this.MinWidth = 1200;
            this.MinHeight = 800;
            this.WindowStartupLocation = WindowStartupLocation.CenterScreen;
        }

        /// <summary>
        /// 当侧边栏请求退出登录时关闭窗口
        /// </summary>
        private void Sidebar_LogoutRequested(object sender, EventArgs e)
        {
            // 如有需要，可在此处先显示登录窗口再关闭当前窗口
            this.Close();
        }
    }
}
