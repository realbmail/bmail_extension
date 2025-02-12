import {decodePubKey, loadWalletJsonFromDB, MailKey} from "./wallet";
import browser from "webextension-polyfill";
import {sendMsgToContent} from "./content_common";
import {Local_App_Nonce, MsgType} from "./consts";
import {ed2CurvePub} from "./edwards25519";
import nacl from "tweetnacl";
import {decodeHex, encodeHex} from "./utils";

export const hostLocalAppName = "com.yushian.bmail.helper";
export const contextMenuId = "openBmailLocalApp"
export const AppCmdOpen = "openApp"
export const AppCmdSendWallet = "sendWallet"
export const AppCmdMoveFile = "moveFile"
export const AppCmdFileKey = "fileKey"

export async function createContextMenu() {

    const wallet = await loadWalletJsonFromDB();
    if (!wallet) {
        console.log("------>>>[createContextMenu] context menu: no local wallet found")
        return
    }

    try {
        const msg = {command: AppCmdSendWallet, data: JSON.stringify(wallet)};
        const result = await browser.runtime.sendNativeMessage(hostLocalAppName, msg);
        if (result.status !== "success") {
            console.log("------>>>[createContextMenu] context menu: local app run failed:", result.info);
            return
        }
    } catch (err) {
        console.log("------>>>[createContextMenu] context menu: 调用 Native Message 失败：", err);
    }

    addContextMenu()
}

function addContextMenu() {
    const menuTitle = browser.i18n.getMessage("start_local_app")
    browser.contextMenus.create({
        id: contextMenuId,
        title: menuTitle,
        contexts: ["all"],
        documentUrlPatterns: [
            "*://mail.google.com/*",
            "*://outlook.live.com/*",
            "*://*.mail.qq.com/*",
            "*://*.mail.163.com/*",
            "*://*.mail.126.com/*",
        ]
    }, () => {
        if (browser.runtime.lastError) {
            console.log("------>>>[addContextMenu] ", browser.runtime.lastError);
        }
    });
}

export async function sendDownloadAction(filePath: string) {

    if (!filePath.endsWith("_bmail")) {
        console.log("------>>>[sendDownloadAction]this is not bmail attachment:", filePath)
        return null;
    }

    try {
        const msg = {command: AppCmdMoveFile, filePath: filePath};
        const result = await browser.runtime.sendNativeMessage(hostLocalAppName, msg);
        console.log("------>>>[sendDownloadAction]收到宿主程序的响应：", result);
        if (result.status === "success") {
            return result.path;
        }
        return null;
    } catch (err) {
        console.log("------>>>[sendDownloadAction]调用 Native Message 失败：", err);
        return null;
    }
}

export function AddMenuListener() {
    browser.contextMenus.onClicked.addListener(async (info) => {
        if (info.menuItemId === contextMenuId) {
            try {
                const msg = {command: AppCmdOpen, data: ""};
                const result = await browser.runtime.sendNativeMessage(hostLocalAppName, msg);
                console.log("------>>>[contextMenus.onClicked]收到宿主程序的响应：", result);
            } catch (err) {
                console.log("------>>>[contextMenus.onClicked]调用 Native Message 失败：", err);
                if (err instanceof Error && err.message.includes("messaging host not found")) {
                    await sendMsgToContent({action: MsgType.LocalAppNotInstall, message: ""})
                    return
                }
            }
        }
    });
}

function removeContextMenu() {
    browser.contextMenus.remove(contextMenuId).then();
}

export async function sendAkToLocalApp(id: string, key: string, mKey: MailKey) {
    try {
        const pub = decodePubKey(mKey.address.bmail_address);
        const curvePub = ed2CurvePub(pub);
        if (!curvePub) {
            return;
        }
        const nonce = decodeHex(Local_App_Nonce)
        const sharedKey = nacl.scalarMult(mKey.curvePriKey, curvePub!);
        const keyUint8Array = new TextEncoder().encode(key);
        const encryptedKey = nacl.secretbox(keyUint8Array, nonce, sharedKey);

        const msg = {command: AppCmdFileKey, key: encodeHex(encryptedKey), id: id};
        const result = await browser.runtime.sendNativeMessage(hostLocalAppName, msg);
        console.log("------>>>[sendAkToLocalApp]收到宿主程序的响应：", result);

    } catch (err) {
        console.log("------>>>[sendAkToLocalApp]调用 Native Message 失败：", err);
    }
}