﻿using System.Security.Cryptography;
using System.Text;
using TweetNaclSharp;  // 引用 TweetNaCl‑CSharp

namespace BMailApp
{
    // 自定义异常类
    public class WalletException : Exception
    {
        public WalletException(string message) : base(message) { }
    }

    // CipherData 用于存储加密数据，属性名称对应 Swift 版本的定义
    public static class CryptoHelper
    {
        /// <summary>
        /// 将十六进制字符串转换为字节数组
        /// </summary>
        public static byte[] DecodeHex(string hex)
        {
            if (hex.Length % 2 != 0)
                throw new WalletException("Hex string must have an even length");

            byte[] bytes = new byte[hex.Length / 2];
            for (int i = 0; i < bytes.Length; i++)
            {
                string byteValue = hex.Substring(i * 2, 2);
                bytes[i] = Convert.ToByte(byteValue, 16);
            }
            return bytes;
        }

        /// <summary>
        /// 主解密方法：
        /// 1. 使用 PBKDF2（SHA256）与 AES-CFB 对 CipherData 进行解密，
        /// 2. 假设解密后的结果为一个 UTF-8 编码的十六进制字符串，
        /// 3. 将该字符串转换为字节数组作为种子，
        /// 4. 调用 Nacl.SignKeyPairFromSeed 生成 Ed25519 签名密钥对，
        /// 5. 返回生成的 SecretKey（64字节）。
        /// </summary>
        public static byte[] Decrypt(string pwd, CipherData cipherData)
        {
            byte[] saltBytes = DecodeHex(cipherData.Salt);
            byte[] ivBytes = DecodeHex(cipherData.Iv);
            byte[] cipherBytes = DecodeHex(cipherData.CipherTxt);
            byte[] passwordBytes = Encoding.UTF8.GetBytes(pwd);

            // 注意：cipherData.KeySize 表示“字数”，每字4字节，所以实际 AES 密钥长度 = KeySize * 4 字节
            int derivedKeyLength = cipherData.KeySize * 4;
            using (var pbkdf2 = new Rfc2898DeriveBytes(passwordBytes, saltBytes, cipherData.Iterations, HashAlgorithmName.SHA256))
            {
                byte[] derivedKey = pbkdf2.GetBytes(derivedKeyLength);

                using (var aes = Aes.Create())
                {
                    aes.Key = derivedKey;
                    aes.IV = ivBytes;
                    aes.Mode = CipherMode.CFB;
                    aes.Padding = PaddingMode.PKCS7;
                    aes.FeedbackSize = 128;

                    using (var decryptor = aes.CreateDecryptor())
                    {
                        byte[] decryptedBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
                        // 假设解密后的结果为一个 UTF-8 编码的十六进制字符串
                        string decryptedHexString = Encoding.UTF8.GetString(decryptedBytes);
                        byte[] priRaw = DecodeHex(decryptedHexString);

                        // 生成 Ed25519 签名密钥对（种子必须为 32 字节）
                        var keyPair = Nacl.SignKeyPairFromSeed(priRaw);
                        return keyPair.SecretKey;
                    }
                }
            }
        }

        /// <summary>
        /// 使用 TweetNaCl‑CSharp 从 32 字节种子生成 Ed25519 签名密钥对
        /// </summary>
        public static (byte[] PrivateKey, byte[] PublicKey) Ed25519KeyPair(byte[] seed)
        {
            if (seed.Length != 32)
                throw new WalletException("Seed must be 32 bytes");
            var keyPair = Nacl.SignKeyPairFromSeed(seed);
            return (keyPair.SecretKey, keyPair.PublicKey);
        }

        /// <summary>
        /// 将 Ed25519 私钥转换为 Curve25519 私钥
        /// （取私钥前32字节，计算 SHA512 并进行 bit-level clamping）
        /// </summary>
        public static byte[] Ed2CurvePri(byte[] privateKey)
        {
            if (privateKey.Length < 32)
                throw new WalletException("Ed25519 private key must be at least 32 bytes");
            byte[] seed = privateKey.Take(32).ToArray();
            using (var sha512 = SHA512.Create())
            {
                byte[] hash = sha512.ComputeHash(seed);
                hash[0] &= 0xF8;
                hash[31] = (byte)((hash[31] & 0x7F) | 0x40);
                return hash.Take(32).ToArray();
            }
        }

        /// <summary>
        /// 使用 TweetNaCl‑CSharp 进行对称加密（Secretbox）
        /// 加密后返回的密文长度比原消息长 SecretboxOverheadLength 字节
        /// </summary>
        public static byte[] EncryptWithTweetNaCl(byte[] messageBytes, byte[] nonce, byte[] key)
        {
            if (nonce.Length != Nacl.SecretboxNonceLength)
                throw new WalletException($"Nonce must be {Nacl.SecretboxNonceLength} bytes");
            if (key.Length != Nacl.SecretboxKeyLength)
                throw new WalletException($"Key must be {Nacl.SecretboxKeyLength} bytes");
            return Nacl.Secretbox(messageBytes, nonce, key);
        }

        /// <summary>
        /// 使用 TweetNaCl‑CSharp 进行对称解密（Secretbox）
        /// 返回原始消息，如果认证失败则返回 null
        /// </summary>
        public static byte[] DecryptWithTweetNaCl(byte[] cipherData, byte[] nonce, byte[] key)
        {
            if (nonce.Length != Nacl.SecretboxNonceLength)
                throw new WalletException($"Nonce must be {Nacl.SecretboxNonceLength} bytes");
            if (key.Length != Nacl.SecretboxKeyLength)
                throw new WalletException($"Key must be {Nacl.SecretboxKeyLength} bytes");
            byte[] plaintext = Nacl.SecretboxOpen(cipherData, nonce, key);
            if (plaintext == null)
                throw new WalletException("TweetNaCl decryption failed");
            return plaintext;
        }
    }
}