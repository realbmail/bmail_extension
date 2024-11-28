import naclUtil from "tweetnacl-util";
import nacl from "tweetnacl";
import {decodePubKey, generateRandomKey, MailKey} from "./wallet";
import {BMRequestToSrv, decodeHex, encodeHex} from "./utils";
import {ed2CurvePub} from "./edwards25519";
import pako from "pako";
import {DecryptRequest} from "./proto/bmail_srv";
import {API_Decrypt_By_Admin} from "./consts";

let MailBodyVersion = '0.0.0';
export const MailFlag = "0be465716ad37c9119253196f921e677";

export function initMailBodyVersion(version: string) {
    MailBodyVersion = version;
    console.log('--------------->>扩展版本号：', MailBodyVersion);
}

export class BMailBody {
    version: string;
    receivers: Map<string, string>;
    cryptoBody: string;
    nonce: Uint8Array;
    sender: string;
    mailFlag: string;
    attachment: string = "";
    isCompressed: boolean = false;
    mailReceiver: string = "";

    constructor(version: string, secrets: Map<string, string>, body: string, nonce: Uint8Array,
                sender: string, attachment?: string, isCompressed: boolean = false, mailReceiver: string = "") {
        this.version = version;
        this.receivers = secrets;
        this.cryptoBody = body;
        this.nonce = nonce;
        this.sender = sender;
        this.mailFlag = MailFlag;
        this.attachment = attachment ?? "";
        this.isCompressed = isCompressed;
        this.mailReceiver = mailReceiver;
    }

    static fromJSON(jsonStr: string): BMailBody {
        const json = JSON.parse(jsonStr);
        const version = json.version;
        const receivers = new Map<string, string>(json.receivers);
        const cryptoBody = json.cryptoBody;
        const nonce = decodeHex(json.nonce);
        const sender = json.sender;
        const isCompressed = json.isCompressed ?? false;
        const mailReceiver = json.mailReceiver ?? "";
        return new BMailBody(version, receivers, cryptoBody,
            nonce, sender, json.attachment, isCompressed, mailReceiver);
    }

    toJSON() {
        return {
            version: this.version,
            mailFlag: this.mailFlag,
            receivers: Array.from(this.receivers.entries()),
            cryptoBody: this.cryptoBody,
            nonce: encodeHex(this.nonce),
            sender: this.sender,
            attachment: this.attachment,
            isCompressed: this.isCompressed,
            mailReceiver: this.mailReceiver,
        };
    }

    addAppendAttachment(mKey: MailKey, attachment: string) {
        const firstEntry = this.receivers.entries().next().value;
        const [peerPubStr, encryptedKey] = firstEntry || ["", ""];
        const peerPub = decodePubKey(peerPubStr);
        const peerCurvePub = ed2CurvePub(peerPub);
        const sharedKey = nacl.scalarMult(mKey.curvePriKey, peerCurvePub!);
        const aesKey = nacl.secretbox.open(decodeHex(encryptedKey), this.nonce, sharedKey);
        const attData = nacl.secretbox(naclUtil.decodeUTF8(attachment), this.nonce, aesKey!);
        this.attachment = naclUtil.encodeBase64(attData);
    }
}

export function encodeMail(peers: string[], data: string, key: MailKey, attachment?: string, mails: string[] = []): BMailBody {
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const aesKey = generateRandomKey();
    let secrets = new Map<string, string>();

    peers.push(key.address.bmail_address);

    peers.forEach(peer => {
        const peerPub = decodePubKey(peer);
        const peerCurvePub = ed2CurvePub(peerPub);
        if (!peerCurvePub) {
            throw new Error("Invalid bmail address,convert to curve pub failed");
        }
        const sharedKey = nacl.scalarMult(key.curvePriKey, peerCurvePub!);
        const encryptedKey = nacl.secretbox(aesKey, nonce, sharedKey);
        secrets.set(peer, encodeHex(encryptedKey));
    });

    const compressedBody = pako.gzip(data);
    const encryptedBody = nacl.secretbox(compressedBody, nonce, aesKey);

    let mailReceiver = ""
    if (mails.length > 0) {
        const encryptedMailAddrData = nacl.secretbox(naclUtil.decodeUTF8(JSON.stringify(mails)), nonce, aesKey);
        mailReceiver = naclUtil.encodeBase64(encryptedMailAddrData)
    }

    let encodedAttachmentKey: string | undefined;
    if (attachment) {
        const attData = nacl.secretbox(naclUtil.decodeUTF8(attachment), nonce, aesKey);
        encodedAttachmentKey = naclUtil.encodeBase64(attData);
    }

    return new BMailBody(
        MailBodyVersion,
        secrets,
        naclUtil.encodeBase64(encryptedBody),
        nonce,
        key.address.bmail_address,
        encodedAttachmentKey,
        true,
        mailReceiver
    );
}


export class PlainMailBody {
    version: string;
    body: string;
    attachment: string = "";

    constructor(version: string, body: string, attachment?: string) {
        this.version = version;
        this.body = body;
        this.attachment = attachment ?? "";
    }
}

export async function decodeMail(mailData: string, key: MailKey, adminAddr: string): Promise<PlainMailBody> {
    const mail = BMailBody.fromJSON(mailData);
    const address = key.address;
    const encryptedKey = mail.receivers.get(address.bmail_address);

    let aesKey: Uint8Array | null = null;
    if (!encryptedKey) {
        const adminKey = mail.receivers.get(adminAddr)
        if (!adminKey) {
            throw new Error("address isn't in receiver list");
        }
        if (mail.mailReceiver.length === 0) {
            throw new Error("mail receiver is empty");
        }
        aesKey = await decodeMailFromSrv(mail, adminKey, key, adminAddr);
    } else {
        const peerPub = decodePubKey(mail.sender);
        const peerCurvePub = ed2CurvePub(peerPub);
        if (!peerCurvePub) {
            throw new Error("Invalid bmail address,convert to curve pub failed");
        }
        const sharedKey = nacl.scalarMult(key.curvePriKey, peerCurvePub);
        aesKey = nacl.secretbox.open(decodeHex(encryptedKey), mail.nonce, sharedKey);
    }

    if (!aesKey) {
        throw new Error("no aes key valid.");
    }

    const bodyBin = nacl.secretbox.open(naclUtil.decodeBase64(mail.cryptoBody), mail.nonce, aesKey);
    if (!bodyBin) {
        throw new Error("decrypt mail body failed");
    }

    const body = mail.isCompressed
        ? pako.ungzip(bodyBin, {to: "string"})
        : naclUtil.encodeUTF8(bodyBin);

    let attachment: string | undefined;
    if (mail.attachment) {
        const attachmentBin = nacl.secretbox.open(naclUtil.decodeBase64(mail.attachment), mail.nonce, aesKey);
        if (!attachmentBin) {
            throw new Error("decrypt mail attachment keys failed");
        }
        attachment = naclUtil.encodeUTF8(attachmentBin);
    }

    return new PlainMailBody(MailBodyVersion, body, attachment);
}

async function decodeMailFromSrv(mail: BMailBody, adminKey: string, key: MailKey, adminAddr: string): Promise<Uint8Array | null> {
    const query = DecryptRequest.create({
        sender: mail.sender,
        adminKey: adminKey,
        mailReceiver: mail.mailReceiver,
        nonce: encodeHex(mail.nonce),
    });

    const message = DecryptRequest.encode(query).finish();
    const signature = MailKey.signData(key.rawPriKey(), message);
    if (!signature) {
        return null;
    }
    const rspData = await BMRequestToSrv(API_Decrypt_By_Admin, key.address.bmail_address, message, signature);
    if (!rspData) {
        return null;
    }

    const adminPub = decodePubKey(adminAddr);
    const adminCurvePub = ed2CurvePub(adminPub);
    if (!adminCurvePub) {
        throw new Error("Invalid bmail admin address");
    }
    const sharedKey = nacl.scalarMult(key.curvePriKey, adminCurvePub);
    // console.log("------>>>==to be removed== aes key for this mail:", aesKey)
    return nacl.secretbox.open(rspData, mail.nonce, sharedKey);
}