//
//  DownloadView.swift
//  BMailApp
//
//  Created by wesley on 2025/2/24.
//
import SwiftUI

struct DownloadView: View {
        @StateObject private var downloadManager = DownloadManager()
        var downloadURL: URL // 通过参数传入下载链接
        
        var body: some View {
                VStack(spacing: 20) {
                        Button(action: {
                                // 调用下载逻辑
                                downloadManager.startDownload(from: downloadURL)
                        }) {
                                Text("开始下载")
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                        .background(Color.blue)
                                        .foregroundColor(.white)
                                        .cornerRadius(10)
                        }
                        
                        if downloadManager.isDownloading {
                                // 显示进度和控制按钮
                                VStack {
                                        ProgressView(value: downloadManager.downloadProgress, total: 1.0)
                                                .progressViewStyle(LinearProgressViewStyle())
                                                .padding()
                                        
                                        Button(action: {
                                                if downloadManager.isDownloading {
                                                        downloadManager.stopDownload()
                                                } else {
                                                        downloadManager.openDirectory()
                                                }
                                        }) {
                                                Text(downloadManager.isDownloading ? "关闭下载" : "完成")
                                                        .frame(maxWidth: .infinity)
                                                        .padding()
                                                        .background(downloadManager.isDownloading ? Color.red : Color.green)
                                                        .foregroundColor(.white)
                                                        .cornerRadius(10)
                                        }
                                        .padding(.top, 20)
                                }
                        }
                }
                .padding()
        }
}
