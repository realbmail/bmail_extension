using System;
using System.Net;

namespace BMailApp
{
    public class WalletDataStore
    {
        public WalletData walletData { get; private set; }

        /// <summary>
        /// 模拟加载钱包数据，加载完成后调用回调函数
        /// </summary>
        /// <param name="callback">加载完成后的回调</param>
        public void LoadWalletData(Action<WalletData> callback)
        {
            // 模拟加载数据，实际可从文件或其他数据源读取
            walletData = new WalletData
            {
                address = new Address
                {
                    bmailAddress = "user@bmail.com"
                }
            };
            callback?.Invoke(walletData);
        }

        /// <summary>
        /// 模拟钱包解锁，正确密码为 "password"，否则抛出异常
        /// </summary>
        /// <param name="password">用户输入的密码</param>
        public void UnlockWallet(string password)
        {
            if (password != "password")
            {
                throw new Exception("密码错误");
            }
        }
    }
}