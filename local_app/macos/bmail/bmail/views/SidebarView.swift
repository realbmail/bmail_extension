//
//  SidebarView.swift
//  BMailApp
//
//  Created by wesley on 2025/2/8.
//


import SwiftUI

struct SidebarView: View {
        @Binding var isLoggedIn: Bool
        @Binding var selectedContent: ContentType
        @State private var showLogoutConfirmation: Bool = false
        
        var body: some View {
                VStack(alignment: .leading, spacing: 10) {
                        // “邮件附件”按钮
                        Button(action: {
                                selectedContent = .mailAttachment
                        }) {
                                Label("邮件附件", systemImage: "doc.on.doc")
                                        .frame(maxWidth: .infinity, minHeight: 44)
                                        .padding(.vertical, 8)
                                        .padding(.horizontal, 12)
                                        .background(Color.red.opacity(0.3))  // 添加背景颜色调试
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        Button(action: {
                                selectedContent = .settings
                        }) {
                                Label("设置", systemImage: "gearshape.fill")
                                        .frame(maxWidth: .infinity, minHeight: 44)
                                        .padding(.vertical, 8)
                                        .padding(.horizontal, 12)
                                        .background(Color.green.opacity(0.3))
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        // “退出”按钮
                        Button(action: {
                                showLogoutConfirmation = true
                        }) {
                                Label("退出", systemImage: "arrow.backward.circle")
                                        .frame(maxWidth: .infinity, minHeight: 44)
                                        .padding(.vertical, 8)
                                        .padding(.horizontal, 12)
                                        .background(Color.blue.opacity(0.3))
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
