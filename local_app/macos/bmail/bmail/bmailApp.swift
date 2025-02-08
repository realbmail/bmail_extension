//
//  bmailApp.swift
//  bmail
//
//  Created by wesley on 2025/2/3.
//

import SwiftUI
import AppKit

// 自定义 AppDelegate
class AppDelegate: NSObject, NSApplicationDelegate {
        func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
                return true // 关闭最后一个窗口时退出应用
        }
        
        func applicationDidFinishLaunching(_ notification: Notification) {
                // 获取第一个窗口（如果你的应用只有一个窗口）
                if let window = NSApplication.shared.windows.first {
                        // 设置窗口的初始尺寸
                        let newSize = NSSize(width: 400, height: 600)
                        window.setContentSize(newSize)
                        // 可选：设置窗口的最小尺寸，防止用户调整得太小
                        window.minSize = newSize
                }
        }
}

@main
struct bmailApp: App {
        @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
        var body: some Scene {
                WindowGroup {
                        LoginView()
                }
        }
}

