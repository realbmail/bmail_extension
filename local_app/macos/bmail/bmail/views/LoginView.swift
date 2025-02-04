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
        @State private var isLoggedIn: Bool = false // 控制是否显示主界面
        
        var body: some View {
                if isLoggedIn {
                        // 登录成功后显示主界面
                        MainView()
                } else {
                        // 登录界面
                        VStack(spacing: 20) {
                                // Logo 图片
                                Image("logo")
                                        .resizable()
                                        .scaledToFit()
                                        .frame(width: 100, height: 100)
                                        .padding(.top, 50)
                                
                                // BMail 地址输入框
                                TextField("BMail 地址", text: $bmailAddress)
                                        .textFieldStyle(RoundedBorderTextFieldStyle())
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
                }
        }
        
        // 登录逻辑
        private func login() {
                // 模拟登录验证
                if bmailAddress == "1" && password == "1" {
                        isLoggedIn = true // 登录成功，切换到主界面
                } else {
                        showAlert = true // 登录失败，显示提示
                }
        }
}
