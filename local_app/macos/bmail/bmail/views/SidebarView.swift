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
                        HStack(spacing: 8) {
                                Image("level_gold")
                                        .resizable()
                                        .scaledToFit()
                                        .frame(width: 20, height: 20)
                                
                                Text("Enterprise Tier")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(Color(red: 133/255, green: 133/255, blue: 153/255))
                        }
                        .padding(.top, 20)
                        .padding(.leading, 16)
                        
                        Divider().padding(.vertical, 8)
                        
                        Button(action: {
                                selectedContent = .mailAttachment
                        }) {
                                HStack(spacing: 8) {
                                        Image("attachment")
                                        Text("Attachment")
                                                .font(.system(size: 12, weight: .regular))
                                }
                                .foregroundColor(.primary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.vertical, 8)
                                .padding(.horizontal, 16)
                                .background(
                                        selectedContent == .mailAttachment
                                        ? Color(red: 238/255, green: 240/255, blue: 241/255)
                                        : Color.clear
                                )
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        // “设置”按钮
                        Button(action: {
                                selectedContent = .settings
                        }) {
                                HStack(spacing: 8) {
                                        Image("settings")
                                        Text("Settings")
                                                .font(.system(size: 12, weight: .regular))
                                }
                                .foregroundColor(.primary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.vertical, 8)
                                .padding(.horizontal, 16)
                                .background(
                                        selectedContent == .settings
                                        ? Color(red: 238/255, green: 240/255, blue: 241/255)
                                        : Color.clear
                                )
                                .contentShape(Rectangle())
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
