using Newtonsoft.Json;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
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
                        if (keyPair == null || keyPair.SecretKey == null)
                        {
                            throw new WalletException("failed to create private key of ed25519");
                        }
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
            if (keyPair == null || keyPair.SecretKey == null || keyPair.PublicKey == null)
                throw new WalletException("nacl keypair is null");
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
            byte[]? plaintext = Nacl.SecretboxOpen(cipherData, nonce, key);
            if (plaintext == null)
                throw new WalletException("TweetNaCl decryption failed");
            return plaintext;
        }

        /// <summary>
        /// 使用 TweetNaCl‑CSharp 进行 Curve25519 密钥协商（即 X25519 算法），
        /// 计算共享密钥：priKey 与 curvePub 进行标量乘法，返回共享密钥字节数组。
        /// </summary>
        /// <param name="priKey">32 字节的私钥</param>
        /// <param name="curvePub">32 字节的公钥</param>
        /// <returns>共享密钥的字节数组</returns>

        public static byte[] ScalarMult(byte[] priKey, byte[] curvePub)
        {
            if (priKey == null || priKey.Length != 32)
                throw new ArgumentException("私钥必须为32字节", nameof(priKey));
            if (curvePub == null || curvePub.Length != 32)
                throw new ArgumentException("公钥必须为32字节", nameof(curvePub));

            var sharedSecret = Nacl.ScalarMult(priKey, curvePub);

            if (sharedSecret == null || sharedSecret.Length != 32)
                throw new InvalidOperationException("Key agreement failed");

            return sharedSecret;
        }



        public static string ExtractIDFromFileName(string fileName)
        {
            // 定义正则表达式，匹配数字后紧跟 "_bmail"
            var regex = new Regex(@"(\d+)_bmail");
            var match = regex.Match(fileName);
            if (match.Success && match.Groups.Count > 1)
            {
                return match.Groups[1].Value;
            }
            else
            {
                throw new ArgumentException($"文件名格式不符合预期：{fileName}");
            }
        }

        public static string ReadContentByKeyId(string id)
        {
            string targetDir = WalletDataFileHelper.GetOrCreateTargetDir();
            // 拼接文件路径，文件名为“.”加上 id
            string keyFilePath = Path.Combine(targetDir, "." + id);
            // 读取文件内容并返回
            return File.ReadAllText(keyFilePath);
        }

    }

    // 用于反序列化 JSON 的数据结构，属性名称与 JSON 键对应
    public class KeyAddress
    {
        public required string Key { get; set; }
        public required string Address { get; set; }
    }

    /// <summary>
    /// 表示附件的加密密钥，格式为 "id_hexData"
    /// 其中 hexData 是经过十六进制编码后的二进制数据，
    /// 前 32 字节为 key，接下来的 24 字节为 nonce
    /// </summary>
    public class AttachmentEncryptKey
    {
        public string Id { get; }
        public byte[] Key { get; }
        public byte[] Nonce { get; }

        public AttachmentEncryptKey(string id, byte[] key, byte[] nonce)
        {
            Id = id;
            Key = key;
            Nonce = nonce;
        }

        /// <summary>
        /// 从格式为 "id_hexData" 的字符串构造 AttachmentEncryptKey 对象
        /// </summary>
        public static AttachmentEncryptKey FromJson(string aekStr)
        {
            int underscoreIndex = aekStr.IndexOf('_');
            if (underscoreIndex == -1)
                throw new WalletException("Invalid input string format.");

            string id = aekStr.Substring(0, underscoreIndex);
            string hexData = aekStr.Substring(underscoreIndex + 1);
            byte[] combined = CryptoHelper.DecodeHex(hexData);

            int keyLength = 32;   // nacl.box.secretKeyLength
            int nonceLength = 24; // nacl.secretbox.nonceLength

            if (combined.Length < keyLength + nonceLength)
                throw new WalletException($"Insufficient data: required {keyLength + nonceLength}, actual {combined.Length}");

            byte[] key = new byte[keyLength];
            byte[] nonce = new byte[nonceLength];
            Array.Copy(combined, 0, key, 0, keyLength);
            Array.Copy(combined, keyLength, nonce, 0, nonceLength);

            return new AttachmentEncryptKey(id, key, nonce);
        }
 
        // 定义本地应用的 nonce（应为 24 字节的十六进制字符串，即 48 个字符）
        private const string LocalAppNonce = "40981a5dc01567a287e10214c4b17f428bdb308b4dc3a968"; // 请根据实际情况替换

        /// <summary>
        /// 解析 JSON 格式的 key 数据，并利用传入的 priKey（私钥）计算共享密钥，
        /// 解密得到附件密钥字符串，最后构造 AttachmentEncryptKey 对象返回
        /// </summary>
        /// <param name="json">包含 key 与 address 的 JSON 字符串</param>
        /// <param name="priKey">调用方传入的私钥字节数组</param>
        public static AttachmentEncryptKey ParseKey(string json, byte[] priKey)
        {
            // 反序列化 JSON 为 KeyAddress 对象
            KeyAddress? keyAddress = JsonConvert.DeserializeObject<KeyAddress>(json);
            if (keyAddress == null)
                throw new WalletException("Failed to parse JSON to KeyAddress.");

            // 将 LocalAppNonce、keyAddress.Address、keyAddress.Key 均视为十六进制字符串解码成字节数组
            byte[] noce = CryptoHelper.DecodeHex(LocalAppNonce);
            byte[] curvePub = CryptoHelper.DecodeHex(keyAddress.Address);
            byte[] cipherData = CryptoHelper.DecodeHex(keyAddress.Key);

            // 计算共享密钥：priKey 与 curvePub 进行 scalar multiplication
            byte[] sharedKey = CryptoHelper.ScalarMult(priKey, curvePub);

            // 使用共享密钥对 cipherData 进行解密
            byte[] decryptedBmailKeyBytes = CryptoHelper.DecryptWithTweetNaCl(cipherData, noce, sharedKey);

            // 将解密得到的字节数组转换为 UTF8 编码字符串
            string bmailKeyStr = Encoding.UTF8.GetString(decryptedBmailKeyBytes);

            // 解析得到的字符串构造 AttachmentEncryptKey 对象（格式要求为 "id_hexData"）
            AttachmentEncryptKey bmailKey = AttachmentEncryptKey.FromJson(bmailKeyStr);

            return bmailKey;
        }
    }
}