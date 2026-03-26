import SwiftUI

struct LoginView: View {
        @State private var bmailAddress: String = ""
        @State private var password: String = ""
        @State private var showAlert: Bool = false
        @State private var isLoggedIn: Bool = false
        @State private var isLoading: Bool = false
        
        @State private var disableInput: Bool = false
        @State private var alertMessage = "请检查 BMail 地址和密码是否正确"
        
        @EnvironmentObject var walletStore: WalletDataStore
        
        var body: some View {
                ZStack {
                        
                        Color.white.ignoresSafeArea()
                        
                        if isLoggedIn {
                                MainView(isLoggedIn: $isLoggedIn)
                        } else {
                                loginContent
                        }
                        
                        if isLoading {
                                LoadingView(loadingText: "正在登录...")
                        }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .onAppear {
                        adjustWindow()
                        if walletStore.walletData == nil {
                                walletStore.loadWalletData(){ walletData in
                                        bmailAddress = walletData.address.bmailAddress
                                }
                        }
                }.onChange(of: isLoading) { oldValue, newValue in
                        disableInput = newValue
                }.onChange(of: isLoggedIn) { oldValue, newValue in
                        NSLog("------>>> isLoggedIn is:\(newValue)")
                        if newValue == false{
                                adjustWindow()
                        }
                }
        }
        
        private var loginContent: some View {
                
                VStack(spacing: 20) {
                        Image("logo")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 80, height: 80)
                                .padding(.top, 80)
                        
                        Text(bmailAddress.isEmpty ? "Sign in BMail extension first please!" : bmailAddress)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(Color(red: 4/255, green: 6/255, blue: 46/255)) // 修改颜色
                                .lineLimit(1)
                                .minimumScaleFactor(0.5)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding()
                                .background(
                                        RoundedRectangle(cornerRadius: 10)
                                                .fill(Color(red: 248/255, green: 249/255, blue: 249/255))
                                )
                                .padding(.horizontal, 20).padding(.top, 10)
                        
                        SecureField("Password", text: $password)
                                .textFieldStyle(PlainTextFieldStyle())
                                .font(.system(size: 12))
                                .foregroundColor(.black)
                                .padding(12)
                                .background(
                                        RoundedRectangle(cornerRadius: 10)
                                                .fill(Color(red: 238/255, green: 240/255, blue: 241/255))
                                )
                                .padding(.horizontal, 20)
                        
                        
                        Button(action: { login() }) {
                                Text("Sign In")
                                        .font(.system(size: 16, weight: .medium))
                                        .foregroundColor(.white)
                                        .padding(.vertical, 12)
                                        .frame(maxWidth: .infinity)
                                        .background(
                                                RoundedRectangle(cornerRadius: 8)
                                                        .fill(Color(red: 241/255, green: 134/255, blue: 82/255))
                                        )
                        }
                        .buttonStyle(PlainButtonStyle())
                        .padding(.horizontal, 20).padding(.top, -5)
                        
                        HStack {
                                Spacer()
                                Button(action: downloadPackage) {
                                        Text("BMail Extension Download")
                                                .font(.system(size: 12, weight: .medium))
                                                .foregroundColor(Color(red: 241/255, green: 134/255, blue: 82/255))
                                                .underline()
                                }
                                .buttonStyle(PlainButtonStyle())
                                .padding(.trailing, 20)
                                .padding(.bottom, 20)
                        }
                        
                        Spacer()
                }
                .alert(isPresented: $showAlert) {
                        Alert(
                                title: Text("Sign in failed"),
                                message: Text(alertMessage),
                                dismissButton: .default(Text("OK"))
                        )
                }
        }
        
        private func downloadPackage() {
                guard let url = URL(string: "https://mail.simplenets.org/file/extension.zip") else {
                        alertMessage = "invalid download link"
                        showAlert = true
                        return
                }
                NSWorkspace.shared.open(url)
        }
        
        private func login() {
                
                guard (walletStore.walletData?.address.bmailAddress) != nil else{
                        showAlert = true
                        alertMessage = "Sign in your Bmail Extention in chrome first please "
                        return
                }
                
                NSLog("------>>> login ......")
                isLoading = true
                DispatchQueue.global().async{
                        do{
                                try walletStore.unlockWallet(with: password)
                                DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                                        isLoggedIn = true
                                        isLoading = false
                                }
                        }catch{
                                NSLog("----->>> decrypt error=\(error.localizedDescription)")
                                DispatchQueue.main.async() {
                                        showAlert = true
                                        isLoading = false
                                        alertMessage = "Sign In error:"+error.localizedDescription
                                }
                        }
                }
        }
        
        static let fixedSizeWindowDelegate = FixedSizeWindowDelegate()
        
        func adjustWindow() {
                DispatchQueue.main.async {
                        NSLog("------>>> adjust login window......")
                        guard let window = NSApplication.shared.windows.first else { return }
                        let windowSize = NSSize(width: 400, height: 600)
                        window.setContentSize(windowSize)
                        window.minSize = windowSize
                        window.maxSize = windowSize
                        window.delegate = LoginView.fixedSizeWindowDelegate
                        window.center()
                        
                        window.standardWindowButton(.zoomButton)?.isHidden = true
                }
        }
}

// 自定义窗口代理
final class FixedSizeWindowDelegate: NSObject, NSWindowDelegate {
        // 禁用双击标题栏触发的缩放
        func windowShouldZoom(_ window: NSWindow, toFrame newFrame: NSRect) -> Bool {
                return false
        }
        
        // 禁用拖拽窗口角落调整大小，始终返回当前大小
        func windowWillResize(_ sender: NSWindow, to frameSize: NSSize) -> NSSize {
                return sender.frame.size
        }
}


#if DEBUG
struct LoginView_Previews: PreviewProvider {
        static var previews: some View {
                let walletStore = WalletDataStore()
                
                return LoginView()
                        .environmentObject(walletStore)
                        .frame(width: 400, height: 600)
                        .previewLayout(.sizeThatFits)
        }
}
#endif
