//
//  MainView.swift
//  bmail
//
//  Created by wesley on 2025/2/4.
//


import SwiftUI

struct MainView: View {
        
        var body: some View {
                VStack {
                        Text("欢迎使用 BMail 应用")
                                .font(.largeTitle)
                                .padding()
                        Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .onAppear {
                        adjustWindow()
                }
        }
        
        func adjustWindow() {
                DispatchQueue.main.async {
                        guard let window = NSApplication.shared.windows.first else { return }
                        
                        let windowSize = NSSize(width: 800, height: 600)
                        window.setContentSize(windowSize)
                        window.minSize = windowSize
                        window.center()
                }
        }
}
