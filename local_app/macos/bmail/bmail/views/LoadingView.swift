import SwiftUI

struct LoadingView: View {
        @State private var isAnimating = false
        var loadingText: String  // 加载文本作为参数传入
        
        var body: some View {
                ZStack {
                        // 半透明背景，让用户聚焦加载视图
                        Color.black.opacity(0.2)
                                .ignoresSafeArea()
                        
                        // 中心加载提示容器
                        VStack(spacing: 12) {
                                // 旋转圆圈，使用与登录按钮类似的橙色
                                Circle()
                                        .trim(from: 0, to: 0.7)
                                        .stroke(
                                                Color(red: 254/255, green: 125/255, blue: 59/255), // 近似 #FE7D3B
                                                style: StrokeStyle(lineWidth: 4, lineCap: .round)
                                        )
                                        .frame(width: 44, height: 44)
                                        .rotationEffect(Angle(degrees: isAnimating ? 360 : 0))
                                        .animation(
                                                Animation.linear(duration: 1)
                                                        .repeatForever(autoreverses: false),
                                                value: isAnimating
                                        )
                                
                                // 加载文字，使用与界面相似的配色
                                Text(loadingText)
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(Color(red: 133/255, green: 133/255, blue: 153/255)) // #858599
                        }
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(10)
                        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
                }
                .onAppear {
                        isAnimating = true
                }
        }
}

#if DEBUG
struct LoadingView_Previews: PreviewProvider {
        static var previews: some View {
                LoadingView(loadingText: "正在登录…")
                        .frame(width: 300, height: 200) // 模拟登录界面大小
                        .previewLayout(.sizeThatFits)
                        .padding()
        }
}
#endif
