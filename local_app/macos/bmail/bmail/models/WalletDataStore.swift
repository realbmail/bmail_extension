//
//  WalletDataStore.swift
//  BMailApp
//
//  Created by wesley on 2025/2/12.
//


import SwiftUI
import Combine

enum WalletError: LocalizedError {
        case walletNotLoaded
        case decryptionFailed(error: Error)
        
        var errorDescription: String? {
                switch self {
                case .walletNotLoaded:
                        return "钱包数据尚未加载。"
                case .decryptionFailed(let error):
                        return "解锁钱包时出错：\(error.localizedDescription)"
                }
        }
}

class WalletDataStore: ObservableObject {
        @Published var walletData: WalletData?
        
        /// 异步加载钱包数据
        func loadWalletData() {
                DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                        do {
                                let data = try loadBmailWallet()
                                // 切换回主线程更新 UI
                                DispatchQueue.main.async {
                                        self?.walletData = data
                                }
                        } catch {
                                // 这里可以添加更完善的错误处理逻辑
                                NSLog("----->>> 加载钱包数据失败: \(error)")
                        }
                }
        }
        
        func unlockWallet(with password: String) throws {
                // 确保钱包数据已加载
                guard var currentWallet = walletData else {
                        throw WalletError.walletNotLoaded
                }
                
                do {
                        // 调用解密函数，解密得到私钥字节数组
                        let decryptedKey = try Decrypt(pwd: password, cipherData: currentWallet.cipherData)
                        currentWallet.priKey = decryptedKey
                        // 更新 Published 属性，通知界面刷新
                        DispatchQueue.main.async {
                                self.walletData = currentWallet
                        }
                } catch {
                        throw WalletError.decryptionFailed(error: error)
                }
        }
        
}
