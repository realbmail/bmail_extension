//
//  FileRow.swift
//  BMailApp
//
//  Created by wesley on 2025/2/11.
//
import SwiftUI

struct FileRow: View {
        let fileURL: URL
        var isSelected: Bool
        
        var iconImage: Image {
                let fileExtension = fileURL.pathExtension.lowercased()
                if fileExtension.hasSuffix("_bmail") {
                        // 使用 "logo" 作为图标
                        return Image("logo")
                }
                switch fileExtension {
                case "pdf":
                        return Image(systemName: "doc.richtext")
                case "jpg", "jpeg", "png":
                        return Image(systemName: "photo")
                default:
                        return Image(systemName: "doc")
                }
        }
        
        var body: some View {
                HStack {
                        iconImage
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 16, height: 16)
                        Text(fileURL.lastPathComponent)
                                .lineLimit(1)
                                .truncationMode(.tail)
                        Spacer()
                }
                .padding(4)
                .background(isSelected ? Color.blue.opacity(0.3) : Color.clear)
                .contentShape(Rectangle())
                .contextMenu {
                        Button(action: {
                        }) {
                                Label("解密文件", systemImage: "doc.text")
                        }
                        
                        Button(action: {
                                do {
                                        try FileManager.default.removeItem(at: fileURL)
                                        print("删除成功：\(fileURL.path)")
                                        NotificationCenter.default.post(name: Notification.Name("RefreshFileList"), object: nil)
                                } catch {
                                        print("删除失败：\(error.localizedDescription)")
                                }
                        }) {
                                Label("删除", systemImage: "trash")
                        }
                }
        }
}
