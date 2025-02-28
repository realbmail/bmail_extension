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
                VStack(alignment: .leading, spacing: 0) {
                        // 顶部标题
                        Text("Enterprise Tier")
                                .font(.system(size: 18, weight: .semibold))
                                .padding(.top, 20)
                                .padding(.leading, 16)
                        
                        
                        // “BMail附件”按钮
                        Button(action: {
                                selectedContent = .mailAttachment
                        }) {
                                HStack(spacing: 8) {
                                        Image("attachment")
                                        Text("Bmail Attachment")
                                }
                                .foregroundColor(.primary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.vertical, 8)
                                .padding(.horizontal, 16)
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        // “设置”按钮
                        Button(action: {
                                selectedContent = .settings
                        }) {
                                HStack(spacing: 8) {
                                        Image("settings")
                                        Text("Settings")
                                }
                                .foregroundColor(.primary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.vertical, 8)
                                .padding(.horizontal, 16)
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        Spacer()
                        
                        // “退出”按钮
                        Button(action: {
                                showLogoutConfirmation = true
                        }) {
                                HStack(spacing: 8) {
                                        Image(systemName: "arrow.backward.circle")
                                        Text("Sign Out")
                                }
                                .foregroundColor(.red)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.vertical, 8)
                                .padding(.horizontal, 16)
                        }
                        .buttonStyle(PlainButtonStyle())
                        .alert(isPresented: $showLogoutConfirmation) {
                                Alert(
                                        title: Text("Sign Out"),
                                        message: Text("Are you sure to sign out？"),
                                        primaryButton: .destructive(Text("Sign Out"), action: {
                                                isLoggedIn = false
                                        }),
                                        secondaryButton: .cancel()
                                )
                        }
                }
                // 限定侧边栏宽度
                .frame(minWidth: 180, maxWidth: 220)
                .background(Color.white)
        }
}

#if DEBUG
struct SidebarView_Previews: PreviewProvider {
        static var previews: some View {
                // 创建两个预览场景：登录状态与未登录状态
                Group {
                        SidebarView(isLoggedIn: .constant(true),
                                    selectedContent: .constant(.mailAttachment))
                        .previewDisplayName("mailAttachment")
                        
                        SidebarView(isLoggedIn: .constant(true),
                                    selectedContent: .constant(.settings))
                        .previewDisplayName("settings")
                }
                // 指定在 macOS 平台下预览，如果你是 iOS / iPadOS 项目可改为对应设备
                .previewLayout(.sizeThatFits)
        }
}
#endif
