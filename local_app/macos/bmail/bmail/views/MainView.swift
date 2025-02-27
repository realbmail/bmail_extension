import SwiftUI

enum ContentType {
        case mailAttachment
        case settings
        case none
}

struct MainView: View {
        @Binding var isLoggedIn: Bool
        @State private var selectedContent: ContentType = .mailAttachment
        
        var body: some View {
                NavigationSplitView {
                        SidebarView(isLoggedIn: $isLoggedIn, selectedContent: $selectedContent).background(Color.white)
                } detail: {
                        switch selectedContent {
                        case .mailAttachment:
                                MailAttachmentView()
                        case .settings:
                                SettingView()
                        case .none:
                                Text("请选择功能")
                        }
                }.background(Color.white)
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

#if DEBUG
struct MainView_Previews: PreviewProvider {
        static var previews: some View {
                MainView(isLoggedIn: .constant(true))
                        .frame(width: 1200, height: 800)
        }
}
#endif
