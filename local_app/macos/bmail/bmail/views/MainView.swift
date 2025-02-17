import SwiftUI

enum ContentType {
        case mailAttachment  // 邮件附件视图
        case settings        // 设置视图
        case none            // 默认显示
}

struct MainView: View {
        @Binding var isLoggedIn: Bool
        @State private var selectedContent: ContentType = .mailAttachment  // 默认显示邮件附件视图
        
        
        var body: some View {
                HStack(spacing: 0) {
                        SidebarView(isLoggedIn: $isLoggedIn, selectedContent: $selectedContent)
                                .frame(width: 200)
                                .background(Color(white: 0.95))
                        
                        // 右侧内容区域，根据 selectedContent 显示不同视图
                        Group {
                                switch selectedContent {
                                case .mailAttachment:
                                        MailAttachmentView()
                                case .settings:
                                        SettingView()
                                case .none:
                                        Text("请选择功能")
                                }
                        }
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
