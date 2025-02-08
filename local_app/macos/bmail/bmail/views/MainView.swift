import SwiftUI

struct MainView: View {
        @Binding var isLoggedIn: Bool
        
        var body: some View {
                HStack(spacing: 0) {
                        SidebarView(isLoggedIn: $isLoggedIn)
                                .frame(width: 200)
                                .background(Color(white: 0.95))
                        
                        // 右侧内容区域（你可以根据需要自定义）
                        ContentView()
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .onAppear {
                        adjustWindow()
                }
        }
        
        func adjustWindow() {
                DispatchQueue.main.async {
                        guard let window = NSApplication.shared.windows.first else { return }
                        let windowSize = NSSize(width: 1200, height: 800)
                        window.setContentSize(windowSize)
                        window.minSize = windowSize
                        window.center()
                }
        }
}

// 示例 ContentView，你可以根据实际需求替换为自己的内容
struct ContentView: View {
        var body: some View {
                VStack {
                        Text("这里是内容区域")
                                .font(.title)
                                .padding()
                        Spacer()
                }
        }
}
