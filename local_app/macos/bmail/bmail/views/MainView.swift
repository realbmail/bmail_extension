//
//  MainView.swift
//  bmail
//
//  Created by wesley on 2025/2/4.
//


import SwiftUI

struct MainView: View {
        @StateObject private var messagingService = NativeMessagingService()
        
        var body: some View {
                VStack {
                        Text("欢迎使用 BMail 应用")
                                .font(.largeTitle)
                                .padding()
                        
                        // 显示收到的消息
                        Text(messagingService.receivedMessage)
                                .padding()
                        
                        Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .onAppear {
                        messagingService.startListening()
                }
        }
}
