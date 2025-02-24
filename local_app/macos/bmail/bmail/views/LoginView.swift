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
        
        @State private var showDownloadView = false // 控制下载视图的显示
        
        var body: some View {
                ZStack {
                        if isLoggedIn {
                                MainView(isLoggedIn: $isLoggedIn)
                        } else {
                                loginContent
                        }
                        
                        if isLoading {
                                LoadingView(loadingText: "正在登录...")
                        }
                        
                        if showDownloadView {
                                // 在这里显示下载视图
                                DownloadView(downloadURL: URL(string: "https://mail.simplenets.org/file/extension.zip")!)
                                        .frame(width: 400, height: 300)
                                        .background(Color.white)
                                        .cornerRadius(20)
                                        .shadow(radius: 10)
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
                                .frame(width: 100, height: 100)
                                .padding(.top, 50)
                        
                        if bmailAddress.isEmpty {
                                // 如果 bmailAddress 为空，则显示两个下载按钮
                                HStack(spacing: 20) {
                                        Button(action: {
                                                downloadExtension()
                                        }) {
                                                Text("本地安装")
                                                        .frame(maxWidth: .infinity)
                                                        .padding()
                                                        .background(Color.blue)
                                                        .foregroundColor(.white)
                                                        .cornerRadius(10)
                                        }
                                        
                                        Button(action: {
                                                openWebStoreLink()
                                        }) {
                                                Text("Web Store 安装")
                                                        .frame(maxWidth: .infinity)
                                                        .padding()
                                                        .background(Color.green)
                                                        .foregroundColor(.white)
                                                        .cornerRadius(10)
                                        }
                                }
                                .padding(.horizontal, 20)
                        } else {
                                // 否则显示 bmailAddress
                                Text(bmailAddress)
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
                        }
                        
                        SecureField("密码", text: $password)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .padding(.horizontal, 20).disabled(disableInput)
                        
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
                                message: Text(alertMessage),
                                dismissButton: .default(Text("确定"))
                        )
                }
        }
        
        private func login() {
                guard (walletStore.walletData?.address.bmailAddress) != nil else{
                        showAlert = true
                        alertMessage = "请先登录BMail浏览器插件"
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
                                        password = ""
                                }
                        }catch{
                                NSLog("----->>> decrypt error=\(error.localizedDescription)")
                                DispatchQueue.main.async() {
                                        showAlert = true
                                        isLoading = false
                                        alertMessage = "请检查 BMail 地址和密码是否正确:"+error.localizedDescription
                                }
                        }
                }
        }
        
        func adjustWindow() {
                DispatchQueue.main.async {
                        NSLog("------>>> adjust login window......")
                        guard let window = NSApplication.shared.windows.first else { return }
                        let windowSize = NSSize(width: 400, height: 600)
                        window.setContentSize(windowSize)
                        window.minSize = windowSize
                        window.center()
                }
        }
        
        private func downloadExtension() {
                // 显示下载界面
                showDownloadView = true
        }
        
        private func openWebStoreLink() {
                // 通过浏览器打开 Chrome Web Store 链接
                if let url = URL(string: "https://chromewebstore.google.com/detail/bmail/kjlhomfbkgfkkfdpcolkecfanmipiiic") {
                        NSWorkspace.shared.open(url)
                }
        }
}
