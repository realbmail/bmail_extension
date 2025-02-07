//
//  Address.swift
//  BMailApp
//
//  Created by wesley on 2025/2/7.
//


import Foundation

// 定义 Address 结构体，用于解析 address 部分
struct Address: Codable {
        let bmailAddress: String
        let ethAddress: String
        
        enum CodingKeys: String, CodingKey {
                case bmailAddress = "bmail_address"
                case ethAddress = "eth_address"
        }
}

// 定义 CipherData 结构体，用于解析 cipher_data 部分
struct CipherData: Codable {
        let cipherTxt: String
        let iv: String
        let salt: String
        let keySize: Int
        let iterations: Int
        
        enum CodingKeys: String, CodingKey {
                case cipherTxt = "cipher_txt"
                case iv, salt
                case keySize = "key_size"
                case iterations
        }
}

// 定义顶层结构体，用于解析整个 JSON 数据
struct WalletData: Codable {
        let address: Address
        let cipherData: CipherData
        let version: Int
        let id: Int
        
        enum CodingKeys: String, CodingKey {
                case address
                case cipherData = "cipher_data"
                case version, id
        }
}

/// 解析 JSON 字符串并返回 WalletData 结构体
/// - Parameter jsonString: 要解析的 JSON 字符串
/// - Returns: 解析成功则返回 WalletData，否则返回 nil
func parseWalletData(from jsonString: String) throws -> WalletData? {
        guard let data = jsonString.data(using: .utf8) else {
                NSLog("------>>> 无法将字符串转换为 Data")
                return nil
        }
        let decoder = JSONDecoder()
        let walletData = try decoder.decode(WalletData.self, from: data)
        return walletData
}


func saveWalletDataToFile(_ walletData: WalletData) throws{
        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted
        let data = try encoder.encode(walletData)
        let fileManager = FileManager.default
        let appSupportDir = try fileManager.url(for: .applicationSupportDirectory,
                                                in: .userDomainMask,
                                                appropriateFor: nil,
                                                create: true)
        let targetDir = appSupportDir.appendingPathComponent("BMailApp", isDirectory: true)
        if !fileManager.fileExists(atPath: targetDir.path) {
                try fileManager.createDirectory(at: targetDir, withIntermediateDirectories: true, attributes: nil)
        }
        let fileURL = targetDir.appendingPathComponent("walletData.json")
        try data.write(to: fileURL)
        NSLog("------>>> 钱包数据已保存到: \(fileURL.path)")
}
