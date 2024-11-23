import * as QRCode from 'qrcode';
import browser from "webextension-polyfill";
import {BMReq, BMRsp} from "./proto/bmail_srv";
import {MailFlag} from "./bmail_body";
import {MsgType} from "./consts";
import * as iconv from 'iconv-lite';
import {getContactSrv} from "./setting";

export const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

export function showView(hash: string, callback?: (hash: string) => void): void {
    const views = document.querySelectorAll<HTMLElement>('.page_view');
    views.forEach(view => view.style.display = 'none');

    const id = hash.replace('#onboarding/', 'view-');
    const targetView = document.getElementById(id);
    if (targetView) {
        targetView.style.display = 'block';
    }
    if (callback) {
        callback(hash);
    }
}

export function encodeHex(array: Uint8Array): string {
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function decodeHex(hexString: string): Uint8Array {
    if (hexString.length % 2 !== 0) {
        throw new Error("Hex string must have an even length");
    }
    return new Uint8Array(Buffer.from(hexString, 'hex'));
}

export async function createQRCodeImg(data: string) {
    try {
        const url = await QRCode.toDataURL(data, {errorCorrectionLevel: 'H'});
        console.log('Generated QR Code:', url);
        return url;
    } catch (error) {
        console.error('Error generating QR Code:', error);
        return null
    }
}

export async function httpApi(path: string, param: any) {
    const url = await getContactSrv();
    const response = await fetch(url + path, {
        method: 'POST', // 设置方法为POST
        headers: {
            'Content-Type': 'application/x-protobuf'
        },
        body: param,
    });
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    const decodedResponse = BMRsp.decode(uint8Array) as BMRsp;
    if (decodedResponse.success) {
        console.log("------>>>httpApi success")
        return decodedResponse.payload;
    } else {
        throw new Error(decodedResponse.msg);
    }
}

export async function sendMessageToBackground(data: any, actTyp: string): Promise<any> {
    try {
        return await browser.runtime.sendMessage({
            action: actTyp,
            data: data,
        });
    } catch (e) {
        const error = e as Error;
        console.log("------>>>send message error", error, data, actTyp);
        if (error.message.includes("Extension context invalidated")) {
            window.location.reload();
        }
        return {success: -1, data: error.message}
    }
}

export async function signDataByMessage(data: any, password?: string): Promise<string | null> {
    const reqData = {
        dataToSign: data,
        password: password,
    }

    const rsp = await sendMessageToBackground(reqData, MsgType.SignData);
    if (rsp.success < 0) {
        return null;
    }

    return rsp.data;
}

export async function BMRequestToSrv(url: string, address: string, message: Uint8Array, signature: string): Promise<any> {

    const postData = BMReq.create({
        address: address,
        signature: signature,
        payload: message,
    });

    const rawData = BMReq.encode(postData).finish();
    return await httpApi(url, rawData);
}

export function isValidEmail(email: string): boolean {
    // 正则表达式用于验证邮件地址
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function extractEmail(input: string): string | null {
    if (!input || input.length === 0) {
        return null;
    }
    // 正则表达式用于匹配电子邮件地址
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = input.match(emailRegex);
    // 如果找到匹配项，返回匹配的电子邮件地址，否则返回 null
    return match ? match[0] : null;
}

export function extractJsonString(input: string): { json: string, offset: number, endOffset: number } | null {
    const tagPositions: { start: number, end: number, length: number }[] = [];
    const tagRegex = /<\/?[^>]+(>|$)/g;
    let match;

    while ((match = tagRegex.exec(input)) !== null) {
        tagPositions.push({start: match.index, end: tagRegex.lastIndex, length: match[0].length});
    }

    const cleanedInput = input.replace(/<\/?[^>]+(>|$)/g, "");

    const jsonRegex = /{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*}/g;
    while ((match = jsonRegex.exec(cleanedInput)) !== null) {
        const jsonString = match[0];

        if (jsonString.includes(MailFlag)) {
            let offset = match.index;
            let endOffset = offset + jsonString.length;

            for (const tag of tagPositions) {
                if (tag.start <= offset) {
                    offset += tag.length; // 将偏移量往后推，保持一致
                    endOffset += tag.length; // 同时调整结束偏移
                } else if (tag.start < endOffset) {
                    endOffset += tag.length; // 只调整结束偏移
                }
            }
            return {json: jsonString, offset, endOffset};
        }
    }
    return null;
}

export function replaceTextInRange(input: string, offset: number, end: number, newText: string): string {
    if (offset < 0 || end < offset || end > input.length) {
        console.log("--------<>>>>>error:", offset, end, input.length)
        throw new Error("Offset or end is out of bounds:");
    }

    const beforeOffset = input.substring(0, offset);
    const afterEnd = input.substring(end);

    return beforeOffset + newText + afterEnd;
}

export function showLoading(): void {
    document.body.classList.add('loading');
    document.getElementById("dialog-waiting-overlay")!.style.display = 'flex';
}

export function hideLoading(): void {
    document.body.classList.remove('loading');
    document.getElementById("dialog-waiting-overlay")!.style.display = 'none';
}

export function moveParenthesesBeforeExtension(filename: string): string {
    const regex = /^(.*?)(\.[^.]+)\s*\(([^)]+)\)$/;
    const match = filename.match(regex);

    if (match) {
        const name = match[1];
        const extension = match[2];
        const parenContent = match[3];

        return `${name} (${parenContent})${extension}`.trim();
    }

    const regexNoExtension = /^(.*)\s*\(([^)]+)\)$/;
    const matchNoExt = filename.match(regexNoExtension);
    if (matchNoExt) {
        const name = matchNoExt[1];
        const parenContent = matchNoExt[2];
        return `${name} (${parenContent})`.trim();
    }

    return filename.trim();
}

export function extractNameFromUrl(url: string, key: string): string | null {
    try {
        const regex = new RegExp(`[?&]${encodeURIComponent(key)}=([^&]*)`);
        const match = url.match(regex);
        const rawParam = match ? match[1] : null;

        if (!rawParam) {
            console.log(`------>>> URL 中未找到参数 ${key}`);
            return null;
        }

        try {
            return decodeURIComponent(rawParam);
        } catch (decodeError) {
            console.warn(`------>>> 参数 ${key} 无法用 UTF-8 解码，尝试 GB18030 解码`);
            try {
                return decodeFilename(rawParam);
            } catch (gbkError) {
                console.warn(`------>>> 参数 ${key} 无法以 GB18030 解码`);
                console.warn(`------>>> GB18030 解码错误信息:`, gbkError);
                return null;
            }
        }
    } catch (error) {
        console.warn("------>>> 解析 URL 时出错:", error);
        return null;
    }
}


function decodeFilename(encodedStr: string): string {
    const bytes: number[] = [];
    for (let i = 0; i < encodedStr.length;) {
        if (encodedStr[i] === '%') {
            const hex = encodedStr.substr(i + 1, 2);
            if (!/^[0-9A-Fa-f]{2}$/.test(hex)) {
                throw new Error(`无效的百分号编码: %${hex}`);
            }
            const byte = parseInt(hex, 16);
            bytes.push(byte);
            i += 3; // 跳过 '%XX'
        } else {
            bytes.push(encodedStr.charCodeAt(i));
            i += 1;
        }
    }
    const buffer = Buffer.from(bytes);
    return iconv.decode(buffer, 'gb18030');
}

export function isValidUrl(urlString: string): boolean {
    try {
        new URL(urlString);
        return true;
    } catch (error) {
        return false;
    }
}

export function sprintf(format: string, ...args: any[]): string {
    return format.replace(/{(\d+)}/g, (match, index) => {
        return typeof args[index] !== 'undefined' ? args[index] : match;
    });
}