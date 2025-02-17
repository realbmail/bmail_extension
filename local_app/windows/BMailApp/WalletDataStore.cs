using System;
using System.Threading.Tasks;

namespace BMailApp
{
    public class WalletDataStore
    {
        /// <summary>
        /// 当前加载的钱包数据
        /// </summary>
        public WalletData? WalletData { get; private set; }

        /// <summary>
        /// 异步加载钱包数据，加载完成后调用回调
        /// </summary>
        /// <param name="completion">加载完成后的回调</param>
        public async Task LoadWalletDataAsync(Action<WalletData> completion = null)
        {
            try
            {
                // 异步从文件中加载钱包数据
                WalletData data = await Task.Run(() =>
                {
                    return WalletDataFileHelper.LoadBmailWallet();
                });

                // 更新钱包数据（如果需要在 UI 线程中更新，可用 Dispatcher.Invoke）
                WalletData = data;
                completion?.Invoke(data);
            }
            catch (Exception ex)
            {
                Console.WriteLine("----->>> 加载钱包数据失败: " + ex.Message);
            }
        }

        /// <summary>
        /// 使用给定密码解锁钱包
        /// </summary>
        /// <param name="password">用户输入的密码</param>
        public void UnlockWallet(string password)
        {
            if (WalletData == null)
                throw new WalletException("钱包数据尚未加载。");

            try
            {
                // 调用 CryptoHelper.Decrypt 进行解密，返回私钥字节数组
                byte[] decryptedKey = CryptoHelper.Decrypt(password, WalletData.CipherData);

                // 更新钱包数据：保存完整私钥和转换后的 Curve25519 私钥
                WalletData.PriKey = decryptedKey;
                WalletData.CurvePriKey = CryptoHelper.Ed2CurvePri(decryptedKey);
            }
            catch (Exception ex)
            {
                throw new WalletException("解锁钱包时出错：" + ex.Message);
            }
        }
    }
}