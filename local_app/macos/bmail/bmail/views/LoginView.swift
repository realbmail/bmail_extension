import SwiftUI

struct LoginView: View {
        @State private var bmailAddress: String = ""
        @State private var password: String = ""
        @State private var showAlert: Bool = false
        @State private var isLoggedIn: Bool = false
        @State private var isLoading: Bool = false
        
        @State private var disableInput: Bool = false
        
        @EnvironmentObject var walletStore: WalletDataStore
        
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
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .onAppear {
                        adjustWindow()
                        if walletStore.walletData == nil {
                                walletStore.loadWalletData()
                        }
                        if let wd = walletStore.walletData{
                                bmailAddress = wd.address.bmailAddress
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
                        
                        Text(bmailAddress.isEmpty ? "请先登录浏览器插件" : bmailAddress)
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
                                message: Text("请检查 BMail 地址和密码是否正确"),
                                dismissButton: .default(Text("确定"))
                        )
                }
        }
        
        private func login() {
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
}
