//
//  fileManger.swift
//  BMailApp
//
//  Created by wesley on 2025/2/8.
//

import Foundation

/// 检查并创建指定路径的目录
func createDirectoryIfNeeded(at path: String) throws {
        let fileManager = FileManager.default
        if !fileManager.fileExists(atPath: path) {
                try fileManager.createDirectory(atPath: path, withIntermediateDirectories: true, attributes: nil)
                NSLog("------>>> 目录创建成功：\(path)")
        } else {
                NSLog("------>>> 目录已存在：\(path)")
        }
}

/// 在用户的 Application Support 目录下创建 "BMailAppData" 目录，并返回该目录的 URL
func createAppDataDirectory()throws -> URL {
        
        let fileManager = FileManager.default
        let documentsDir = try fileManager.url(for: .documentDirectory,
                                               in: .userDomainMask,
                                               appropriateFor: nil,
                                               create: true)
        
        let targetDir = documentsDir.appendingPathComponent(AttachmentDir, isDirectory: true)
        
        try createDirectoryIfNeeded(at: targetDir.path)
        NSLog("------>>> 应用数据目录路径：\(targetDir.path)")
        return targetDir
}

func destinationURL(for sourceURL: URL) throws -> URL {
        // 获取 UI 应用管理的目录
        let appDataDir = try createAppDataDirectory()
        // 使用源文件的文件名作为目标文件名
        return appDataDir.appendingPathComponent(sourceURL.lastPathComponent)
}

func loadBmailAttachmentUrls() ->[URL]{
        let fileManager = FileManager.default
        
        // 获取当前用户的 Documents 目录
        guard let documentsURL = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first else {
                print("无法获取 Documents 目录")
                return []
        }
        // 拼接 "BMailAttachments" 子目录
        let targetDir = documentsURL.appendingPathComponent(AttachmentDir, isDirectory: true)
        
        do {
                let fileURLs = try fileManager.contentsOfDirectory(at: targetDir,
                                                                   includingPropertiesForKeys: nil,
                                                                   options: [.skipsHiddenFiles])
                
                return fileURLs
        } catch {
                print("无法加载目录下的文件：\(error.localizedDescription)")
        }
        return []
}
