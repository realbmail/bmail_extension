//
//  LoginView.swift
//  bmail
//
//  Created by wesley on 2025/2/4.
//
//
//  LoginView.swift
//  bmail
//
//  Created by wesley on 2025/2/4.
//

import SwiftUI

struct LoginView: View {
        @State private var bmailAddress: String = ""
        @State private var password: String = ""
        @State private var showAlert: Bool = false
        @State private var isLoggedIn: Bool = false // 控制是否显示登录成功状态
        @State private var isLoading: Bool = false  // 控制是否显示 LoadingView
        
        var body: some View {
                ZStack {
                        // 主体内容：登录界面或登录成功状态
                        if isLoggedIn {
                                MainView()
                        } else {
                                VStack(spacing: 20) {
                                        // Logo 图片
                                        Image("logo")
                                                .resizable()
                                                .scaledToFit()
                                                .frame(width: 100, height: 100)
                                                .padding(.top, 50)
                                        
                                        // BMail 地址显示（只读）
                                        Text(bmailAddress.isEmpty ? "BMail 地址" : bmailAddress)
                                                .font(.system(size: 16))
                                                .lineLimit(1)
                                                .minimumScaleFactor(0.5)
                                                .frame(maxWidth: .infinity, alignment: .leading)
                                                .padding()
                                                .background(
                                                        RoundedRectangle(cornerRadius: 10)
                                                                .stroke(Color.gray, lineWidth: 1)
                                                )
                                                .padding(.horizontal, 20)
                                        
                                        // 密码输入框
                                        SecureField("密码", text: $password)
                                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                                .padding(.horizontal, 20)
                                        
                                        // 登录按钮
                                        Button(action: {
                                                login()
                                        }) {
                                                Text("登录")
                                                        .frame(maxWidth: .infinity)
                                                        .padding()
                                                        .background(Color.blue)
                                                        .foregroundColor(.white)
                                                        .cornerRadius(10)
                                        }
                                        .padding(.horizontal, 20)
                                        .padding(.top, 20)
                                        
                                        Spacer()
                                }
                                .alert(isPresented: $showAlert) {
                                        Alert(
                                                title: Text("登录失败"),
                                                message: Text("请检查 BMail 地址和密码是否正确"),
                                                dismissButton: .default(Text("确定"))
                                        )
                                }
                                // 这里不再限定固定的 view 大小，由外部窗口控制
                                .disabled(isLoading)
                        }
                        
                        // LoadingView 层，当 isLoading 为 true 时显示，并居中
                        if isLoading {
                                // 添加一个透明遮罩层防止用户点击底层内容
                                Color.black.opacity(0.001)
                                        .ignoresSafeArea()
                                LoadingView(loadingText: "正在登录...")
                                        .frame(width: 100, height: 100)
                                        .background(Color.white.opacity(0.8))
                                        .cornerRadius(10)
                                        .shadow(radius: 10)
                        }
                }
                // 让 ZStack 占满整个父容器，确保 LoadingView 居中
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .onAppear {
                        if let storedAddress = loadBmailAddress() {
                                bmailAddress = storedAddress
                        }
                }
        }
        
        // 登录逻辑
        private func login() {
                isLoading = true
                // 模拟网络请求或验证延时（例如2秒）
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        if password == "1" {
                                isLoggedIn = true  // 登录成功，切换到“已登录”状态
                        } else {
                                showAlert = true   // 登录失败，显示提示
                        }
                        isLoading = false      // 处理完成后隐藏 LoadingView
                }
        }
        
        func loadBmailAddress() -> String? {
                do {
                        let walletData = try loadBmailWallet()
                        print("------>>> bmail_address: \(walletData.address.bmailAddress)")
                        return walletData.address.bmailAddress
                } catch {
                        print("------>>> 加载钱包数据失败：\(error)")
                        return nil
                }
        }
}
