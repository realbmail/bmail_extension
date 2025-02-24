import SwiftUI

class DownloadManager: NSObject, ObservableObject, URLSessionDownloadDelegate {
        @Published var downloadProgress: Double = 0.0
        @Published var isDownloading: Bool = false
        @Published var isCompleted: Bool = false
        var downloadTask: URLSessionDownloadTask?
        var downloadURL: URL?
        var saveURL: URL?
        
        func startDownload(from url: URL) {
                // 选择保存目录
                let panel = NSSavePanel()
                //                panel.allowedFileTypes = ["zip"]
                panel.canCreateDirectories = true
                panel.begin { response in
                        if response == .OK, let directoryURL = panel.url {
                                self.saveURL = directoryURL
                                self.downloadFile(from: url, to: directoryURL)
                        }
                }
        }
        
        private func downloadFile(from url: URL, to directory: URL) {
            // 确保目标文件路径存在，并且是文件
            let fileManager = FileManager.default
            let destinationURL = directory.appendingPathComponent("extension.zip")
            
            // 确保目标目录存在
            if !fileManager.fileExists(atPath: directory.path) {
                do {
                    try fileManager.createDirectory(at: directory, withIntermediateDirectories: true, attributes: nil)
                } catch {
                    print("Error creating directory: \(error)")
                    return
                }
            }
            
            // 目标文件如果存在，先删除
            if fileManager.fileExists(atPath: destinationURL.path) {
                do {
                    try fileManager.removeItem(at: destinationURL)
                } catch {
                    print("Error removing existing file: \(error)")
                    return
                }
            }
            
            // 设置下载进程
            let session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
            self.downloadTask = session.downloadTask(with: url)
            self.downloadURL = url
            self.isDownloading = true
            self.isCompleted = false
            self.downloadTask?.resume()
        }

        
        
        func stopDownload() {
                downloadTask?.cancel()
                self.isDownloading = false
        }
        
        func openDirectory() {
                if let path = saveURL?.deletingLastPathComponent().path {
                        // 将路径转换为 URL，然后打开
                        let directoryURL = URL(fileURLWithPath: path)
                        NSWorkspace.shared.open(directoryURL)
                }
        }
        
        // URLSessionDownloadDelegate 方法
        func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
                DispatchQueue.main.async {
                        self.isDownloading = false
                        self.isCompleted = true
                        if let saveURL = self.saveURL {
                                do {
                                        // 保存文件到选择的目录
                                        let fileManager = FileManager.default
                                        let destinationURL = saveURL.appendingPathComponent("extension.zip")
                                        try fileManager.moveItem(at: location, to: destinationURL)
                                        self.openDirectory()
                                } catch {
                                        print("Error saving file: \(error)")
                                }
                        }
                }
        }
        
        func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didWriteData bytesWritten: Int64, totalBytesWritten: Int64, totalBytesExpectedToWrite: Int64) {
                DispatchQueue.main.async {
                        self.downloadProgress = Double(totalBytesWritten) / Double(totalBytesExpectedToWrite)
                }
        }
}
