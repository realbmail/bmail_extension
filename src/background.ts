/// <reference lib="webworker" />
import browser, {Runtime} from "webextension-polyfill";
import {closeDatabase, initDatabase} from "./database";
import {resetStorage, sessionGet, sessionSet} from "./session_storage";
import {MailAddress, MailKey} from "./wallet";
import {BMRequestToSrv, decodeHex, extractJsonString, extractNameFromUrl} from "./utils";
import {BMailBody, decodeMail, encodeMail, initMailBodyVersion, MailFlag} from "./bmail_body";
import {BMailAccount, QueryReq, EmailReflects, BindAction} from "./proto/bmail_srv";
import {
    __dbKey_cur_account_details,
    __dbKey_cur_addr,
    __dbKey_cur_key,
    __key_wallet_status, API_Bind_Email, API_Query_Bmail_Details, API_Query_By_EMails, API_Unbind_Email,
    MsgType,
    WalletStatus
} from "./consts";
import {extractAesKeyId, sendMsgToContent} from "./content_common";
import {openWallet, updateIcon} from "./wallet_util";
import {getAdminAddress} from "./setting";
import {parseEmailTemplate} from "./main_common";
import {AddMenuListener, createContextMenu, sendAkToLocalApp, sendDownloadAction} from "./local_app";

const runtime = browser.runtime;
const alarms = browser.alarms;
const __alarm_name__: string = '__alarm_name__timer__';

runtime.onMessage.addListener((request: any, _sender: Runtime.MessageSender, sendResponse: (response?: any) => void): true | void => {
    // console.log("------>>> action :=>", request.action, sender.url);
    switch (request.action) {
        case MsgType.KeepAlive:
            sendResponse({status: true});
            return true;

        case  MsgType.BMailInbox:
            browser.action.openPopup().then(() => {
                sendResponse({success: true});
            }).catch((error) => {
                console.error("------>>> bmail inbox action failed:", error);
                sendResponse({success: false, error: error.message});
            });
            return true;

        case  MsgType.EncryptData:
            encryptData(request.receivers, request.data, sendResponse, request.attachment, request.mailReceiver).then();
            return true;

        case MsgType.DecryptData:
            decryptData(request.data, sendResponse).then();
            return true;

        case MsgType.EmailAddrToBmailAddr:
            searchAccountByEmails(request.data, sendResponse).then();
            return true;

        case MsgType.CheckIfLogin:
            checkLoginStatus(sendResponse).then();
            return true;

        case MsgType.SignData:
            SigDataInBackground(request.data, sendResponse).then();
            return true;

        case MsgType.QueryAccountDetails:
            getAccount(request.data.address, request.data.force, sendResponse).then()
            return true;

        case MsgType.BindAction:
            bindingAction(request.data.isUnbind, request.data.mail, sendResponse).then();
            return true;

        case MsgType.IfBindThisEmail:
            checkIfAccountBound(request.data, sendResponse).then();
            return true;

        case MsgType.OpenPlugin:
            browser.action.openPopup().then();
            sendResponse({success: 1, data: ""});
            return true;

        case MsgType.QueryCurBMail:
            queryCurrentBmailAddress(sendResponse).then();
            return true;

        case MsgType.AdminAddress:
            getAdminAddress().then(str => {
                sendResponse({success: true, data: str});
            })
            return true;
        case MsgType.KeyForLocalApp:
            sendAkToLocalApp(request.data.id, request.data.key).then();
            sendResponse({success: 1, data: ""});
            return true;
        default:
            sendResponse({status: false, message: 'unknown action'});
            return;
    }
});

async function createAlarm(): Promise<void> {
    const alarm = await alarms.get(__alarm_name__);
    if (!alarm) {
        alarms.create(__alarm_name__, {
            periodInMinutes: 1
        });
    }
}

alarms.onAlarm.addListener(timerTaskWork);

async function timerTaskWork(alarm: any): Promise<void> {
    if (alarm.name === __alarm_name__) {
        // console.log("------>>> Alarm Triggered!");
    }
}

self.addEventListener('install', (event) => {
    console.log('------>>> Service Worker installing...');
    const evt = event as ExtendableEvent;
    evt.waitUntil(createAlarm());
});

self.addEventListener('activate', (event) => {
    const extendableEvent = event as ExtendableEvent;
    extendableEvent.waitUntil((self as unknown as ServiceWorkerGlobalScope).clients.claim());
    console.log('------>>> Service Worker activating......');
    resetStorage().then();

    const manifestData = browser.runtime.getManifest();
    initMailBodyVersion(manifestData.version);
    updateIcon(false);

    initDatabase().then(() => {
        createContextMenu().then()
        AddMenuListener();
        console.log("------>>> context menu setup success")
    });

});

runtime.onInstalled.addListener((details: Runtime.OnInstalledDetailsType) => {
    console.log("------>>> onInstalled event triggered......");
    if (details.reason === "install") {
        browser.tabs.create({
            url: runtime.getURL("html/home.html#onboarding/welcome")
        }).then(() => {
        });
    }
});

runtime.onStartup.addListener(() => {
    console.log('------>>> Service Worker onStartup......');
    updateIcon(false);

    initDatabase().then(() => {
        createContextMenu().then()
        AddMenuListener();
        console.log("------>>> context menu setup success")
    });
});

runtime.onSuspend.addListener(() => {
    console.log('------>>> Browser is shutting down, closing IndexedDB...');
    closeDatabase();
});

async function checkWalletStatus(sendResponse: (response: any) => void) {
    let walletStatus = await sessionGet(__key_wallet_status) || WalletStatus.Init;
    const sObj = await sessionGet(__dbKey_cur_key);

    if (walletStatus !== WalletStatus.Unlocked || !sObj) {
        await browser.action.openPopup();
        sendResponse({success: 0, message: "open wallet first please!"});
        return null;
    }
    return new MailKey(new Uint8Array(sObj));
}

async function encryptData(peerAddr: string[], plainTxt: string, sendResponse: (response: any) => void, attachment?: string, mailReceiver: string[] = []) {
    try {
        const mKey = await checkWalletStatus(sendResponse);
        if (!mKey) {
            sendResponse({success: -1, message: "no open wallet found"});
            return;
        }
        if (peerAddr.length <= 0) {
            sendResponse({success: -1, message: "no valid blockchain address of receivers"});
            return null;
        }

        if (plainTxt.includes(MailFlag)) {
            const encryptedMailBody = extractJsonString(plainTxt);
            const rawObj = BMailBody.fromJSON(encryptedMailBody!.json);
            if (!rawObj.attAesKey && attachment) {
                rawObj.addAppendAttachment(mKey, attachment)
                sendResponse({success: true, data: JSON.stringify(rawObj)});
                return;
            }
            sendResponse({success: true, data: plainTxt});
        }

        const mail = encodeMail(peerAddr, plainTxt, mKey, attachment, mailReceiver);
        // console.log("------>>> encrypted mail body =>", mail);
        sendResponse({success: true, data: JSON.stringify(mail)});
    } catch (err) {
        console.log("------>>> encrypt data failed:", err)
        sendResponse({success: -1, message: `internal error: ${err}`});
    }
}

async function decryptData(mailData: string, sendResponse: (response: any) => void) {
    try {
        const mKey = await checkWalletStatus(sendResponse);
        if (!mKey) {
            return;
        }
        const adminAddress = await getAdminAddress();
        const mailBody = await decodeMail(mailData, mKey, adminAddress);
        sendResponse({success: 1, data: mailBody.body, attachment: mailBody.attachment});
    } catch (err) {
        console.log("------>>> decrypt data failed:", err)
        sendResponse({success: -1, message: browser.i18n.getMessage("decrypt_mail_body_failed") + ` error: ${err}`});
    }
}

async function checkLoginStatus(sendResponse: (response: any) => void) {
    try {
        const status = await sessionGet(__key_wallet_status) || WalletStatus.Init
        if (status !== WalletStatus.Unlocked) {
            await browser.action.openPopup();
            sendResponse({success: -1, data: "open wallet first please!"});
            return;
        }
        sendResponse({success: 1});
    } catch (err) {
        console.log("------>>> checkLoginStatus failed:", err)
    }
}

async function SigDataInBackground(data: any, sendResponse: (response: any) => void) {
    const dataToSign = decodeHex(data.dataToSign);
    const pwd = data.password;
    const status = await sessionGet(__key_wallet_status) || WalletStatus.Init
    if (status !== WalletStatus.Unlocked) {
        if (!pwd) {
            sendResponse({success: false, message: "open wallet first"});
            return;
        }
        const address = await openWallet(pwd);
        if (!address) {
            sendResponse({success: false, message: "open wallet failed"});
            return;
        }
    }

    const priData = await sessionGet(__dbKey_cur_key);
    if (!priData) {
        sendResponse({success: false, message: "private raw data lost"});
        return;
    }

    const signature = MailKey.signData(new Uint8Array(priData), dataToSign);
    if (!signature) {
        sendResponse({success: false, message: "sign data failed"});
        return;
    }

    sendResponse({success: true, data: signature});
}

async function getAccount(address: string, force: boolean, sendResponse: (response: any) => void) {
    console.log("------>>> loading account info from server", address, force);
    let account = await sessionGet(__dbKey_cur_account_details);
    if (account && !force) {
        sendResponse({success: 1, data: account});
        return;
    }
    try {
        account = await loadAccountDetailsFromSrv(address);
        if (!account) {
            sendResponse({success: -1, message: "fetch account details failed"});
            return;
        }
        sendResponse({success: 1, data: account});
    } catch (err) {
        const e = err as Error;
        sendResponse({success: -1, message: e.message});
        console.log("------>>> load account details from server =>", err);
        return null;
    }
}

async function loadAccountDetailsFromSrv(address: string): Promise<BMailAccount | null> {
    if (!address) {
        console.log("------>>> no address found locally =>");
        return null;
    }

    const payload = QueryReq.create({
        address: address,
    });
    const message = QueryReq.encode(payload).finish();
    const sig = await signData(message);
    if (!sig) {
        console.log("------>>> signature not found");
        return null;
    }

    const srvRsp = await BMRequestToSrv(API_Query_Bmail_Details, address, message, sig)
    if (!srvRsp) {
        console.log("------>>> fetch failed no response data found");
        return null;
    }
    const accountDetails = BMailAccount.decode(srvRsp) as BMailAccount;
    await sessionSet(__dbKey_cur_account_details, accountDetails);
    return accountDetails;

}

async function signData(message: Uint8Array) {
    const priData = await sessionGet(__dbKey_cur_key);
    if (!priData) {
        return null;
    }

    const signature = MailKey.signData(new Uint8Array(priData), message);
    if (!signature) {
        return null;
    }
    return signature;
}

async function searchAccountByEmails(emails: string[], sendResponse: (response: any) => void) {
    if (emails.length <= 0) {
        sendResponse({success: -1, message: "invalid email addresses"});
        return;
    }
    const mKey = await checkWalletStatus(sendResponse);
    if (!mKey) {
        return;
    }

    try {
        const addr = await sessionGet(__dbKey_cur_addr) as MailAddress | null;
        if (!addr) {
            sendResponse({success: -2, message: "open wallet first"});
            return;
        }

        const query = QueryReq.create({
            emailList: emails,
        })
        const message = QueryReq.encode(query).finish();
        const signature = await signData(message);
        if (!signature) {
            console.log("------>>> sign data failed");
            sendResponse({success: -3, message: "sign data failed"});
            return;
        }
        const rspData = await BMRequestToSrv(API_Query_By_EMails, addr.bmail_address, message, signature);
        if (!rspData) {
            console.log("------>>> no contact data");
            sendResponse({success: -4, message: "no blockchain address found"});
            return;
        }
        const result = EmailReflects.decode(rspData) as EmailReflects
        sendResponse({success: 1, data: result});
    } catch (e) {
        console.log("------>>> search bmail accounts failed:", e)
        sendResponse({success: -5, message: "network failed:" + e});
    }
}

async function checkIfAccountBound(email: string | null | undefined, sendResponse: (response: any) => void) {
    if (!email) {
        sendResponse({success: -1, message: browser.i18n.getMessage("curr_email_invalid")});
        return
    }

    let account = await sessionGet(__dbKey_cur_account_details) as BMailAccount | null;
    if (!account) {
        await browser.action.openPopup();
        sendResponse(null);
        return;
    }

    for (let i = 0; i < account.emails.length; i++) {
        if (account.emails[i] === email) {
            sendResponse({success: 1, message: "already bound"});
            return;
        }
    }
    sendResponse({success: -1, message: browser.i18n.getMessage("curr_email_unbind")});
}

async function bindingAction(isUnbind: boolean, email: string, sendResponse: (response: any) => void) {
    try {
        const addr = await sessionGet(__dbKey_cur_addr) as MailAddress | null;
        if (!addr) {
            sendResponse({success: -1, message: "open wallet first"});
            return;
        }

        const payload: BindAction = BindAction.create({
            address: addr.bmail_address,
            mail: email,
        });

        let apiPath = isUnbind ? API_Unbind_Email : API_Bind_Email;
        if (!isUnbind) {
            const mailBody = await parseEmailTemplate(email, addr.bmail_address,
                browser.i18n.getMessage("bind_confirm_title"),
                browser.i18n.getMessage("bind_confirm_subtitle"),
                "",
                browser.i18n.getMessage("bind_confirm_btn"));
            payload.subject = browser.i18n.getMessage("bind_confirm_subject");
            payload.mailBody = mailBody;
        }

        const message = BindAction.encode(payload).finish();
        const sig = await signData(message);
        if (!sig) {
            sendResponse({success: -1, message: "sign data failed"});
            return;
        }

        const srvRsp = await BMRequestToSrv(apiPath, addr.bmail_address, message, sig)
        console.log("------>>> binding or unbind=", isUnbind, " action success:=>", srvRsp);
        sendResponse({success: 1, message: (srvRsp as Uint8Array)[0]});

        loadAccountDetailsFromSrv(addr.bmail_address).then()
    } catch (e) {
        const err = e as Error;
        console.log("------>>> bind account failed:", err);
        sendResponse({success: -1, message: err.message});
    }
}

async function queryCurrentBmailAddress(sendResponse: (response: any) => void) {
    const status = await sessionGet(__key_wallet_status) || WalletStatus.Init
    if (status !== WalletStatus.Unlocked) {
        await browser.action.openPopup();
        sendResponse({success: -1, data: "open wallet first please!"});
        return;
    }

    const addr = await sessionGet(__dbKey_cur_addr) as MailAddress
    if (!addr) {
        sendResponse({success: -1, data: "open wallet first please!"});
        return;
    }

    sendResponse({success: 1, data: addr.bmail_address});
}

const outlookDownloadItems = new Set<number>();
const initiatedDownloadUrls = new Set<string>();

browser.downloads.onCreated.addListener(async (downloadItem) => {
    const downloadUrl = downloadItem.url;
    // if (processedDownloads.has(downloadUrl)) {
    //     console.log("------>>> download file:", downloadItem.filename)
    //     return;
    // }
    //

    // console.log("------>>> new download item:", downloadItem)

    if (initiatedDownloadUrls.has(downloadUrl)) {
        console.log("------>>> duplicate item download:", downloadItem)
        initiatedDownloadUrls.delete(downloadUrl);
        return;
    }

    if (downloadUrl.includes("outlook.live.com")) {
        outlookDownloadItems.add(downloadItem.id);
        // console.log("------>>> new download item create:", downloadItem)
    } else if (downloadUrl.includes("mail.qq.com")) {
        // console.log("------>>> qq download url:=>", downloadUrl);
        try {
            await downloadQQAttachment(downloadUrl);
        } catch (e) {
            console.log("------>>> download qq attachment failed:", e, downloadUrl);
        }
    }
});

async function downloadQQAttachment(url: string) {
    const fileName = extractNameFromUrl(url, 'name') || extractNameFromUrl(url, 'filename');
    const parsedId = extractAesKeyId(fileName);
    if (!parsedId) {
        console.log("------>>> no need to decrypt this file", fileName, url);
        return;
    }
    initiatedDownloadUrls.add(url);
    const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // 如果需要携带 Cookie
    });

    if (!response.ok) {
        throw new Error(`网络响应失败，状态码：${response.status}`);
    }
    const fileData = await response.arrayBuffer();
    const rawData = new Uint8Array(fileData);


    const attData = {
        data: Array.from(rawData),
        aekID: parsedId.id,
        fileName: parsedId.originalFileName,
    }

    const tabs = await browser.tabs.query({url: "*://*.mail.qq.com/*"});
    for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        if (!tab.id || !tab.url) {
            continue;
        }

        const result = await browser.tabs.sendMessage(tab.id!, {
            action: MsgType.BMailDownload,
            attachment: attData,
            fileName: fileName,
        });
        // console.log("------>>> qq file download decrypt result:", result)
        if (result.success) {
            initiatedDownloadUrls.delete(url);
        }
    }
}

browser.downloads.onChanged.addListener(async (delta) => {
    if (!delta.state || delta.state.current !== "complete") {
        return;
    }

    const downloadId = delta.id;

    const items = await browser.downloads.search({id: downloadId});
    const downloadFile = items[0];
    let fileName = downloadFile.filename;
    // console.log("------>>> downloads on change file name: ", fileName);
    const newDownloadFilePath = await sendDownloadAction(fileName);

    if (!outlookDownloadItems.has(downloadId)) {
        return;
    }

    if (!fileName) {
        // console.log("------>>> file name in download item not found:", delta);
        outlookDownloadItems.delete(downloadId); // 清除已处理的下载 ID
        return;
    }

    const bmailFile = extractAesKeyId(fileName);
    if (!bmailFile) {
        // console.log("------>>> this file is not for bmail :", fileName);
        outlookDownloadItems.delete(downloadId); // 清除已处理的下载 ID
        return;
    }

    if (newDownloadFilePath) {
        fileName = newDownloadFilePath;
    }

    await sendMsgToContent({action: MsgType.BMailDownload, fileName: fileName})

    outlookDownloadItems.delete(downloadId);
});

// function moveBmailFileByHostApp(fileName: string) {
// }

//
// let processedDownloads = new Set();
//
// async function handleExistingDownloads() {
//     const downloads = await browser.downloads.search({});
//
//     downloads.forEach(downloadItem => {
//         if (!downloadItem.exists) {
//             console.log("------>>> download item doesn't exist:", downloadItem.filename)
//             return;
//         }
//
//         processedDownloads.add(downloadItem.url); // 添加到已处理集合
//     });
// }
//
// handleExistingDownloads().then();
