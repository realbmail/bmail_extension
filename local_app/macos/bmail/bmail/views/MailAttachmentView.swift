//
//  MailAttachmentView.swift
//  BMailApp
//
//  Created by wesley on 2025/2/8.
//

import SwiftUI
struct MailAttachmentView: View {
        @State private var fileURLs: [URL] = []
        @State private var selectedFile: URL? = nil  // 当前选中的文件
        @State private var distributedObserver: NSObjectProtocol?
        
        var body: some View {
                VStack(alignment: .leading) {
                        Text("BMail附件")
                                .font(.title)
                                .padding(.bottom, 10)
                        
                        if fileURLs.isEmpty {
                                // 当没有文件时，显示提示文本，并且该区域支持右键菜单
                                Text("目录中没有文件")
                                        .foregroundColor(.gray)
                        } else {
                                List(fileURLs, id: \.self) { fileURL in
                                        FileRow(fileURL: fileURL, isSelected: fileURL == selectedFile)
                                                .contentShape(Rectangle())  // 扩大点击区域到整行
                                                .onTapGesture {
                                                        selectedFile = fileURL
                                                }
                                                .listRowSeparator(.hidden)
                                }
                                .listStyle(PlainListStyle())
                        }
                        
                        Spacer()
                }
                .padding()
                // 为整个视图添加右键菜单：无论文件列表是否为空，右键点击空白区域都会弹出菜单
                .contextMenu {
                        Button("刷新") {
                                loadFiles()
                        }
                        // 可以添加更多菜单项
                }
                .onAppear {
                        loadFiles()
                        distributedObserver = DistributedNotificationCenter.default().addObserver(
                                forName: Notification.Name("FileMovedNotification"),
                                object: nil,
                                queue: OperationQueue.main
                        ) { notification in
                                print("收到文件移动通知: \(notification.userInfo?["path"] ?? "")")
                                loadFiles()
                        }
                }
                .onReceive(NotificationCenter.default.publisher(for: Notification.Name("RefreshFileList"))) { _ in
                        loadFiles()
                }
                .onDisappear {
                        // 移除分布式通知观察者
                        if let observer = distributedObserver {
                                DistributedNotificationCenter.default().removeObserver(observer)
                        }
                }
        }
        
        private func loadFiles() {
                fileURLs = loadBmailAttachmentUrls()
        }
}
