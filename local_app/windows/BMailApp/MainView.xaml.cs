using System.ComponentModel;
using System.Windows;
using System.Windows.Controls;

namespace BMailApp
{
    public partial class MainView : UserControl, INotifyPropertyChanged
    {
        private ContentType selectedContent = ContentType.MailAttachment;
        public event PropertyChangedEventHandler? PropertyChanged;

        /// <summary>
        /// 当前选中的内容类型，默认为 BMail附件
        /// </summary>
        public ContentType SelectedContent
        {
            get { return selectedContent; }
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

        public MainView()
        {
            InitializeComponent();
            DataContext = this;
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
                        VerticalAlignment = VerticalAlignment.Center
                    };
                    break;
            }
        }

        /// <summary>
        /// 界面加载时调整窗口大小（1200×800，居中显示）
        /// </summary>
        private void UserControl_Loaded(object sender, RoutedEventArgs e)
        {
            var window = Window.GetWindow(this);
            if (window != null)
            {
                window.Width = 1200;
                window.Height = 800;
                window.MinWidth = 1200;
                window.MinHeight = 800;
                window.WindowStartupLocation = WindowStartupLocation.CenterScreen;
            }
        }

        /// <summary>
        /// 当侧边栏请求退出登录时，关闭当前窗口
        /// </summary>
        private void Sidebar_LogoutRequested(object sender, EventArgs e)
        {
            var window = Window.GetWindow(this);
            if (window != null)
            {
                // 这里可以根据需要先显示登录窗口再关闭当前窗口
                window.Close();
            }
        }
    }
}