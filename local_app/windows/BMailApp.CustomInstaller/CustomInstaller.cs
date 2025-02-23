using System;
using System.Collections;
using System.ComponentModel;
using System.Configuration.Install;
using System.IO;
using System.Text;

[RunInstaller(true)]
public class CustomInstaller : Installer
{
    public override void Install(IDictionary stateSaver)
    {
        base.Install(stateSaver);
        try
        {
            // 从 CustomActionData 中获取安装目录（注意参数名必须与 CustomActionData 中一致，通常使用 "targetdir"）
            string targetDir = Context.Parameters["targetdir"];
            if (string.IsNullOrEmpty(targetDir))
                throw new Exception("未获取到安装目录参数。");

            // 确保安装目录以反斜杠结尾
            if (!targetDir.EndsWith("\\"))
                targetDir += "\\";

            // 定义 JSON 文件的完整路径，文件将存放在安装目录下
            string jsonFilePath = Path.Combine(targetDir, "com.yushian.bmail.helper.json");

            // 构造 BMailApp.exe 的完整路径（假设你的可执行文件名就是 BMailApp.exe）
            string appExePath = Path.Combine(targetDir, "BMailApp.exe");
            string jsonAppExePath = appExePath.Replace(@"\", @"\\");

            // 构造 JSON 文件的内容，动态替换安装目录（appExePath）部分
            string jsonContent = $@"{{
  ""name"": ""com.yushian.bmail.helper"",
  ""description"": ""BMail App Native Messaging Host"",
  ""path"": ""{jsonAppExePath}"",
  ""type"": ""stdio"",
  ""allowed_origins"": [
    ""chrome-extension://kjlhomfbkgfkkfdpcolkecfanmipiiic/"",
    ""chrome-extension://medjdfpcdolhehloaifeglgcmnkiplog/"",
    ""chrome-extension://ikgahkicnpejefphekiikmdjjbohacbc/"",
    ""chrome-extension://nndbmahejplagdcjmliknjkgflnlakaf/""
  ]
}}";

            // 将 JSON 内容写入文件，使用 UTF8 编码
            File.WriteAllText(jsonFilePath, jsonContent, Encoding.UTF8);
        }
        catch (Exception ex)
        {
            // 安装过程中发生错误时，抛出 InstallException
            throw new InstallException("在安装过程中生成 JSON 文件时出错：", ex);
        }
    }
}
