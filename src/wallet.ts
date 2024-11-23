import Hex from "crypto-js/enc-hex";
import PBKDF2 from "crypto-js/pbkdf2";
import AES from "crypto-js/aes";
import Utf8 from "crypto-js/enc-utf8";
import CFB from "crypto-js/mode-cfb";
import WordArray from "crypto-js/lib-typedarrays";
import {mnemonicToSeedSync} from "bip39";
import {ec as EC} from "elliptic";
import base58 from "bs58";
import {keccak256} from "js-sha3";
import {__tableNameWallet, getMaxIdRecord} from "./database";
import nacl from 'tweetnacl';
import {decodeHex, encodeHex} from "./utils";
import {ed2CurvePri} from "./edwards25519";

const BMailAddrPrefix = "BM";

const CryptoKeySize = 8;
const ScryptN = 1024;

class CipherData {
    cipher_txt: string;
    iv: string;
    salt: string;
    key_size: number;
    iterations: number;
    constructor(cipherTxt: string, iv: string, salt: string,keySize:number,iterations:number) {
        this.cipher_txt = cipherTxt;
        this.iv = iv;
        this.salt = salt;
        this.key_size = keySize;
        this.iterations = iterations;
    }
}

export class DbWallet {
    address: MailAddress;
    cipher_data: CipherData;
    version: number = 1;

    constructor(address: MailAddress, cipherObj: CipherData) {
        this.address = address;
        this.cipher_data = cipherObj;
    }
}

export class MailAddress {
    public bmail_address: string;
    public eth_address: string;

    constructor(address: string, ethAddress: string) {
        this.bmail_address = address;
        this.eth_address = ethAddress;
    }
}

export class MailKey {
    private readonly priRaw: Uint8Array;
    private readonly ecKey: EC.KeyPair;
    readonly bmailKey: nacl.SignKeyPair;
    readonly curvePriKey: Uint8Array;
    public address: MailAddress;

    constructor(priRaw: Uint8Array) {
        this.priRaw = priRaw;
        const ec = new EC('secp256k1');
        this.ecKey = ec.keyFromPrivate(priRaw);
        this.bmailKey = nacl.sign.keyPair.fromSeed(priRaw);
        this.curvePriKey = ed2CurvePri(this.bmailKey.secretKey);
        this.address = new MailAddress(this.getPub(), this.getEthPub());
    }

    private getPub(): string {
        const publicKeyArray = this.bmailKey.publicKey;
        const publicKeyUint8Array = new Uint8Array(publicKeyArray);
        const encodedAddress = base58.encode(publicKeyUint8Array);
        return BMailAddrPrefix + encodedAddress;
    }

    private getEthPub(): string {
        const publicKey = this.ecKey.getPublic();
        const publicKeyBytes = Buffer.from(publicKey.encode('array', false).slice(1));
        const hashedPublicKey = keccak256(publicKeyBytes);
        return '0x' + hashedPublicKey.slice(-40);
    }

    rawPriKey(): Uint8Array {
        return this.priRaw;
    }

    static signData(priRaw: Uint8Array, message: Uint8Array): string {
        const signKey = nacl.sign.keyPair.fromSeed(priRaw);
        const signature = nacl.sign.detached(message, signKey.secretKey);
        return encodeHex(signature);
    }

    static verifySignature(priRaw: Uint8Array, signature: string, message: Uint8Array): boolean {
        try {
            const signKey = nacl.sign.keyPair.fromSeed(priRaw);
            const detachedSignature = decodeHex(signature);
            return nacl.sign.detached.verify(message, detachedSignature, signKey.publicKey);
        } catch (e) {
            console.log("------>>> verifySignature failed", e);
            return false;
        }
    }

    static isValidAddress(address: string): boolean {
        if (!address.startsWith(BMailAddrPrefix)) {
            return false; // 地址必须以BMailAddrPrefix开头
        }

        const encodedAddress = address.slice(BMailAddrPrefix.length);

        try {
            const decoded = base58.decode(encodedAddress);
            if (decoded.length !== 32) {
                // 公钥应该是32字节的长度
                return false;
            }
        } catch (e) {
            // 如果解码失败，则说明不是有效的Base58编码
            return false;
        }

        return true; // 如果上述检查都通过，则认为这是一个有效的地址
    }
}

export function newWallet(mnemonic: string, password: string): DbWallet {
    const seedBuffer = mnemonicToSeedSync(mnemonic);
    const first32Bytes = seedBuffer.subarray(0, 32);
    const seedUint8Array: Uint8Array = new Uint8Array(first32Bytes);
    const key = new MailKey(seedUint8Array);
    const seedHex = encodeHex(seedUint8Array);
    const data = encryptAes(seedHex, password);
    return new DbWallet(key.address, data);
}


export function encryptAes(plainTxt: string, password: string): CipherData {
    const salt = WordArray.random(128 / 8);
    const key = PBKDF2(password, salt, {
        keySize: CryptoKeySize,
        iterations: ScryptN
    });
    const iv = WordArray.random(128 / 8);

    const encrypted = AES.encrypt(plainTxt, key, { iv: iv, mode: CFB });

    return {
        cipher_txt: encrypted.ciphertext.toString(Hex), // 使用Hex编码ciphertext
        iv: iv.toString(Hex), // 使用Hex编码iv
        salt: salt.toString(Hex), // 使用Hex编码salt
        key_size: CryptoKeySize,
        iterations: ScryptN
    };
}

export function decryptAes(data: CipherData, password: string): string {
    const salt = Hex.parse(data.salt);
    const iv = Hex.parse(data.iv);
    const key = PBKDF2(password, salt, {
        keySize: data.key_size,
        iterations: data.iterations
    });
    const encryptedHex = Hex.parse(data.cipher_txt);

    const decrypted = AES.decrypt({ ciphertext: encryptedHex } as any, key, { iv: iv, mode: CFB });
    return decrypted.toString(Utf8); // 将解密后的数据转换为UTF-8编码
}

export async function loadWalletJsonFromDB(): Promise<DbWallet | null> {
    const walletObj = await getMaxIdRecord(__tableNameWallet);
    if (!walletObj) {
        return null;
    }
    return walletObj;
}

export function castToMemWallet(pwd: string, wallet: DbWallet): MailKey {
    const decryptedPri = decryptAes(wallet.cipher_data, pwd);
    const priArray = decodeHex(decryptedPri);
    return new MailKey(priArray);
}

export function decodePubKey(pubKeyStr: string): Uint8Array {
    if (!pubKeyStr.startsWith(BMailAddrPrefix)) {
        throw new Error("Invalid public key prefix");
    }
    const encodedAddress = pubKeyStr.slice(BMailAddrPrefix.length);
    return base58.decode(encodedAddress);
}


export function generateRandomKey(): Uint8Array {
    return nacl.randomBytes(nacl.box.secretKeyLength);
}

export function generateKeyPairFromSecretKey(secretKey: Uint8Array): nacl.BoxKeyPair {
    return nacl.box.keyPair.fromSecretKey(secretKey);
}