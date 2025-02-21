﻿using System.IO;
using System.Windows;
using System.Windows.Controls;

namespace BMailApp
{
    public partial class MailAttachmentView : UserControl
    {
        private List<string> filePaths = new List<string>();
        private string? selectedFile;

        public MailAttachmentView()
        {
            InitializeComponent();
        }

        private void UserControl_Loaded(object sender, RoutedEventArgs e)
        {
            LoadFiles();
            // 如果需要监听外部事件来刷新列表，可以在此处添加订阅
        }

        private void RefreshMenuItem_Click(object sender, RoutedEventArgs e)
        {
            LoadFiles();
        }

        private void FilesListBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (FilesListBox.SelectedItem != null)
            {
                selectedFile = FilesListBox.SelectedItem.ToString();
                // 此处可根据需要添加选中文件后的处理逻辑
            }
        }

        private void DecryptMenuItem_Click(object sender, RoutedEventArgs e)
        {
            if (FilesListBox.SelectedItem != null)
            {
                selectedFile = FilesListBox.SelectedItem.ToString();
                if (selectedFile == null)
                {
                    MessageBox.Show("文件不存在");
                    return;
                }

                DecryptFile(selectedFile);
            }
        }

        private void OpenMenuItem_Click(object sender, RoutedEventArgs e)
        {
            if (FilesListBox.SelectedItem != null)
            {
                selectedFile = FilesListBox.SelectedItem.ToString();
                if (selectedFile == null)
                {
                    MessageBox.Show("无法打开文件");
                    return;
                }
                string attachmentsDirectory = WalletDataFileHelper.GetOrCreateTargetDir();
                string filePath = System.IO.Path.Combine(attachmentsDirectory, selectedFile);

                try
                {
                    // 使用 UseShellExecute = true 以便调用系统默认应用程序打开文件
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(filePath) { UseShellExecute = true });
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"无法打开文件: {ex.Message}");
                }
            }
        }



        private void DeleteMenuItem_Click(object sender, RoutedEventArgs e)
        {
            if (FilesListBox.SelectedItem != null)
            {
                selectedFile = FilesListBox.SelectedItem.ToString();
                if (selectedFile == null)
                {
                    LoadFiles();
                    return;
                }
                // 在此添加删除逻辑
                // 示例：删除文件并刷新列表
                string attachmentsDirectory = WalletDataFileHelper.GetOrCreateTargetDir();
                string filePath = System.IO.Path.Combine(attachmentsDirectory, selectedFile);
                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                    LoadFiles();
                    MessageBox.Show($"已删除文件: {selectedFile}");
                }
            }
        }


        /// <summary>
        /// 加载附件文件列表，示例中从指定目录读取文件路径（请根据实际情况修改）
        /// </summary>
        private void LoadFiles()
        {
            // 假设附件存放在 "C:\Attachments" 文件夹中
            string attachmentsDirectory = WalletDataFileHelper.GetOrCreateTargetDir();

            if (Directory.Exists(attachmentsDirectory))
            {
                filePaths = Directory.GetFiles(attachmentsDirectory)
                              .Where(file => (File.GetAttributes(file) & FileAttributes.Hidden) == 0)
                              .ToList();
            }
            else
            {
                filePaths.Clear();
            }

            FilesListBox.Items.Clear();
            if (filePaths.Count == 0)
            {
                NoFilesTextBlock.Visibility = Visibility.Visible;
            }
            else
            {
                NoFilesTextBlock.Visibility = Visibility.Collapsed;
                foreach (var file in filePaths)
                {
                    // 这里只显示文件名，可根据需要调整显示信息
                    FilesListBox.Items.Add(System.IO.Path.GetFileName(file));
                }
            }
        }

        private void DecryptFile(string file)
        {

        }
    }
}