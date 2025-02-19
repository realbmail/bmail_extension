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
        public required string BmailAddress { get; set; }

        [JsonProperty("eth_address")]
        public required string EthAddress { get; set; }
    }

    public class CipherData
    {
        [JsonProperty("cipher_txt")]
        public required string CipherTxt { get; set; }

        [JsonProperty("iv")]
        public required string Iv { get; set; }

        [JsonProperty("salt")]
        public required string Salt { get; set; }

        [JsonProperty("key_size")]
        public required int KeySize { get; set; }

        [JsonProperty("iterations")]
        public required int Iterations { get; set; }
    }

    public class WalletData
    {
        [JsonProperty("address")]
        public required Address Address { get; set; }

        [JsonProperty("cipher_data")]
        public required CipherData CipherData { get; set; }

        [JsonProperty("version")]
        public required int Version { get; set; }

        [JsonProperty("id")]
        public required int Id { get; set; }

        [JsonIgnore]
        public byte[]? PriKey { get; set; }

        [JsonIgnore]
        public byte[]? CurvePriKey { get; set; }
    }
}