import SwiftUI

struct LoginView: View {
        @State private var bmailAddress: String = ""
        @State private var password: String = ""
        @State private var showAlert: Bool = false
        @State private var isLoggedIn: Bool = false
        @State private var isLoading: Bool = false
        
        @State private var disableInput: Bool = false
        
        var body: some View {
                ZStack {
                        if isLoggedIn {
                                MainView()
                        } else {
                                loginContent
                        }
                        
                        if isLoading {
                                LoadingView(loadingText: "正在登录...")
                        }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .onAppear {
                        if let storedAddress = loadBmailAddress() {
                                bmailAddress = storedAddress
                        }
                }.onChange(of: isLoading) { oldValue, newValue in
                        disableInput = newValue
                }
        }
        
        private var loginContent: some View {
                VStack(spacing: 20) {
                        Image("logo")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 100, height: 100)
                                .padding(.top, 50)
                        
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
                DispatchQueue.main.asyncAfter(deadline: .now() + 12) {
                        if password == "1" {
                                isLoggedIn = true
                        } else {
                                showAlert = true
                        }
                        isLoading = false
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
