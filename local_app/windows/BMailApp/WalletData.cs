using Newtonsoft.Json;
namespace BMailApp
{
    /// <summary>
    /// 常量定义，类似于 Swift 中的 AppShareDir、WalletFile、AttachmentDir
    /// </summary>
    public static class WalletConstants
    {
        public const string AppShareDir = "BMailApp";
        public const string WalletFile = "walletData.json";
        public const string AttachmentDir = "BMailAttachments";
    }


    public class Address
    {
        [JsonProperty("bmail_address")]
        public string BmailAddress { get; set; }

        [JsonProperty("eth_address")]
        public string EthAddress { get; set; }
    }

    public class CipherData
    {
        [JsonProperty("cipher_txt")]
        public string CipherTxt { get; set; }

        [JsonProperty("iv")]
        public string Iv { get; set; }

        [JsonProperty("salt")]
        public string Salt { get; set; }

        [JsonProperty("key_size")]
        public int KeySize { get; set; }

        [JsonProperty("iterations")]
        public int Iterations { get; set; }
    }

    public class WalletData
    {
        [JsonProperty("address")]
        public Address Address { get; set; }

        [JsonProperty("cipher_data")]
        public CipherData CipherData { get; set; }

        [JsonProperty("version")]
        public int Version { get; set; }

        [JsonProperty("id")]
        public int Id { get; set; }

        [JsonIgnore]
        public byte[] PriKey { get; set; }

        [JsonIgnore]
        public byte[] CurvePriKey { get; set; }
    }
}