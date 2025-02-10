import {loadWalletJsonFromDB} from "./wallet";
import browser from "webextension-polyfill";
import {sendMsgToContent} from "./content_common";
import {MsgType} from "./consts";

export const hostLocalAppName = "com.yushian.bmail.helper";
export const contextMenuId = "openBmailLocalApp"
export const AppCmdOpen = "openApp"
export const AppCmdSendWallet = "sendWallet"
export const AppCmdMoveFile = "moveFile"

export async function createContextMenu() {

    const wallet = await loadWalletJsonFromDB();
    if (!wallet) {
        console.log("------>>>context menu: no local wallet found")
        return
    }

    try {
        const msg = {command: AppCmdSendWallet, data: JSON.stringify(wallet)};
        const result = await browser.runtime.sendNativeMessage(hostLocalAppName, msg);
        if (result.status !== "success") {
            console.log("------>>>context menu: local app run failed:", result.info);
            return
        }
    } catch (err) {
        console.log("------>>>context menu: 调用 Native Message 失败：", err);
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
            console.log("------>>>", browser.runtime.lastError);
        }
    });
}

export async function sendDownloadAction(filePath: string) {

    if (!filePath.endsWith("_bmail")) {
        console.log("------>>>this is not bmail attachment:", filePath)
        return;
    }

    try {
        const msg = {command: AppCmdMoveFile, filePath: filePath};
        const result = await browser.runtime.sendNativeMessage(hostLocalAppName, msg);
        console.log("------>>>收到宿主程序的响应：", result);
    } catch (err) {
        console.log("------>>>调用 Native Message 失败：", err);
    }
}

export function AddMenuListener() {
    browser.contextMenus.onClicked.addListener(async (info, tab) => {
        if (info.menuItemId === contextMenuId) {
            try {
                const msg = {command: AppCmdOpen, data: ""};
                const result = await browser.runtime.sendNativeMessage(hostLocalAppName, msg);
                console.log("------>>>收到宿主程序的响应：", result);
            } catch (err) {
                console.log("------>>>调用 Native Message 失败：", err);
                if (err instanceof Error && err.message.includes("messaging host not found")) {
                    await sendMsgToContent({action: MsgType.LocalAppNotInstall, message: ""})
                    return
                }
            }
        }
    });
}

function removeContextMenu() {
    browser.contextMenus.remove(contextMenuId).then(r => {
        console.log("------>>>菜单项 'Open BMail App' 已删除");
    });
}