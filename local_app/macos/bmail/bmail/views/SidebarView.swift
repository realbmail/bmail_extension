//
//  SidebarView.swift
//  BMailApp
//
//  Created by wesley on 2025/2/8.
//


import SwiftUI

struct SidebarView: View {
        @Binding var isLoggedIn: Bool
        @State private var showLogoutConfirmation: Bool = false
        
        var body: some View {
                VStack(alignment: .leading, spacing: 10) {
                        // “邮件附件”按钮
                        Button(action: {
                                // 处理“邮件附件”功能
                        }) {
                                Label("邮件附件", systemImage: "doc.on.doc")
                                        .padding(.vertical, 8)
                                        .padding(.horizontal, 12)
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        // 其他功能按钮（示例：功能2）
                        Button(action: {
                                // 功能2操作
                        }) {
                                Label("功能2", systemImage: "tray.full")
                                        .padding(.vertical, 8)
                                        .padding(.horizontal, 12)
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        // “退出”按钮
                        Button(action: {
                                showLogoutConfirmation = true
                        }) {
                                Label("退出", systemImage: "arrow.backward.circle")
                                        .padding(.vertical, 8)
                                        .padding(.horizontal, 12)
                        }
                        .buttonStyle(PlainButtonStyle())
                        .alert(isPresented: $showLogoutConfirmation) {
                                Alert(
                                        title: Text("确认退出"),
                                        message: Text("确定要退出吗？"),
                                        primaryButton: .destructive(Text("退出"), action: {
                                                isLoggedIn = false
                                        }),
                                        secondaryButton: .cancel()
                                )
                        }
                        
                        Spacer()
                }
                .padding(.top, 20)
                .padding(.horizontal, 10)
        }
}
