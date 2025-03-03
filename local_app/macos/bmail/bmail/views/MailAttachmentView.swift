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
                        
                        if fileURLs.isEmpty {
                                Text("No Bmail files")
                                        .foregroundColor(.gray)
                                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        } else {
                                List(fileURLs, id: \.self) { fileURL in
                                        FileRow(fileURL: fileURL, isSelected: fileURL == selectedFile)
                                                .listRowInsets(EdgeInsets(top: 6, leading: 0, bottom: 6, trailing: 0))
                                                .listRowBackground(Color.clear)
                                                .onTapGesture {
                                                        selectedFile = fileURL
                                                }
                                                .listRowSeparator(.hidden)
                                }
                                .listStyle(PlainListStyle())
                                .scrollContentBackground(.hidden)
                        }
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 16)
                .background(Color.white)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .contextMenu {
                        Button("Reload") {
                                loadFiles()
                        }
                }
                .onAppear {
                        loadFiles()
                        distributedObserver = DistributedNotificationCenter.default().addObserver(
                                forName: Notification.Name("FileMovedNotification"),
                                object: nil,
                                queue: OperationQueue.main
                        ) { notification in
                                loadFiles()
                        }
                }
                .onReceive(NotificationCenter.default.publisher(for: Notification.Name("RefreshFileList"))) { _ in
                        loadFiles()
                }
                .onDisappear {
                        if let observer = distributedObserver {
                                DistributedNotificationCenter.default().removeObserver(observer)
                        }
                }
        }
        
        private func loadFiles() {
                fileURLs = loadBmailAttachmentUrls()
        }
}

#if DEBUG
struct MailAttachmentView_Previews: PreviewProvider {
        static var previews: some View {
                MailAttachmentView()
                        .previewLayout(.sizeThatFits)
                        .padding()
        }
}
#endif
