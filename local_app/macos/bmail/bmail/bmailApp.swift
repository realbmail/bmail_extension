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
