import SwiftUI

struct LoadingView: View {
    @State private var isAnimating = false
    var loadingText: String  // 加载文本作为参数传入

    var body: some View {
        VStack(spacing: 16) {
            // 旋转的圆圈
            Circle()
                .trim(from: 0, to: 0.7)
                .stroke(Color.blue, lineWidth: 5)
                .frame(width: 50, height: 50)
                .rotationEffect(Angle(degrees: isAnimating ? 360 : 0))
                .animation(
                    Animation.linear(duration: 1)
                        .repeatForever(autoreverses: false),
                    value: isAnimating
                )
            
            // 显示动态加载文本
            Text(loadingText)
                .font(.headline)
        }
        .onAppear {
            isAnimating = true
        }
    }
}

struct LoadingView_Previews: PreviewProvider {
    static var previews: some View {
        LoadingView(loadingText: "加载中...")
    }
}
