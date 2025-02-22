﻿using Serilog;
using System.IO;
using System.Security.Cryptography.Xml;
using System.Security.Policy;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using TweetNaclSharp;

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
            if (FilesListBox.SelectedItem == null)
            {
                return;
            }
            selectedFile = FilesListBox.SelectedItem.ToString();

            if (selectedFile == null)
            {
                MessageBox.Show("文件不存在");
                return;
            }

            try
            {
                DecryptFile(selectedFile);
                LoadFiles();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"解密文件失败: {ex.Message}");
            }
        }

        private void OpenFileByFileName(string? fileName)
        {
            if (fileName == null)
            {
                throw new ArgumentNullException("文件名无效");
            }

            string attachmentsDirectory = WalletDataFileHelper.GetOrCreateTargetDir();
            string filePath = System.IO.Path.Combine(attachmentsDirectory, fileName);

            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(filePath) { UseShellExecute = true });
        }

        private void OpenMenuItem_Click(object sender, RoutedEventArgs e)
        {
            if (FilesListBox.SelectedItem == null)
            {
                return;
            }
            try
            {
                OpenFileByFileName(FilesListBox.SelectedItem.ToString());
            }
            catch (Exception ex)
            {
                MessageBox.Show($"无法打开文件: {ex.Message}");
            }
        }


        private void FilesListBox_MouseDoubleClick(object sender, MouseButtonEventArgs e)
        {
            if (FilesListBox.SelectedItem == null)
            {
                return;
            }

            var selectedFile = FilesListBox.SelectedItem.ToString();
            if (selectedFile == null)
            {
                return;
            }
            string extension = System.IO.Path.GetExtension(selectedFile);
            try
            {
                if (extension.Contains("_bmail"))
                {
                    DecryptFile(selectedFile);
                    LoadFiles();
                    return;
                }
                OpenFileByFileName(selectedFile);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"无法打开文件: {ex.Message}");
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

        private void DecryptFile(string fileName)
        {
            WalletData? walletData = WalletDataStore.Instance.WalletData;
            byte[]? curvePriKey = (walletData?.CurvePriKey) ?? throw new Exception("请先解密账号");


            string extractedID = CryptoHelper.ExtractIDFromFileName(fileName);
            Log.Information($"------>>> extracted id is:{extractedID}");

            string keyContent = CryptoHelper.ReadContentByKeyId(extractedID);

            AttachmentEncryptKey bmailKey = AttachmentEncryptKey.ParseKey(keyContent, curvePriKey);

            string attachmentsDirectory = WalletDataFileHelper.GetOrCreateTargetDir();
            string filePath = System.IO.Path.Combine(attachmentsDirectory, fileName);
            string decryptFilePath = Path.ChangeExtension(filePath, null);
            string uniqueFilePath = GetUniqueFilePath(decryptFilePath);

            byte[] bmailFileData = File.ReadAllBytes(filePath);
            byte[]? plaintext = Nacl.SecretboxOpen(bmailFileData, bmailKey.Nonce, bmailKey.Key) ?? throw new Exception("解码内容为空");
            File.WriteAllBytes(uniqueFilePath, plaintext);
        }

        /// <summary>
        /// 如果文件已存在，则在文件名后追加 (1), (2) ... 直到找到一个不存在的文件名
        /// </summary>
        /// <param name="filePath">原始文件路径</param>
        /// <returns>唯一的文件路径</returns>
        public static string GetUniqueFilePath(string filePath)
        {
            if(filePath == null) return "";

            if (!File.Exists(filePath))
                return filePath;

            string? directory = Path.GetDirectoryName(filePath);
            if (!Directory.Exists(directory)) return filePath;


            string fileNameWithoutExtension = Path.GetFileNameWithoutExtension(filePath);
            string extension = Path.GetExtension(filePath);
            int count = 1;
            string newFilePath;

            do
            {
                newFilePath = Path.Combine(directory, $"{fileNameWithoutExtension}({count}){extension}");
                count++;
            } while (File.Exists(newFilePath));

            return newFilePath;
        }

    }
}