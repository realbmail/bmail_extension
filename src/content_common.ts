import browser from "webextension-polyfill";
import {
    EncryptedMailDivSearch,
    extractJsonString,
    hideLoading,
    isValidEmail,
    replaceTextInRange,
    sendMessageToBackground,
    showLoading
} from "./common";
import {MailFlag} from "./bmail_body";
import {EmailReflects} from "./proto/bmail_srv";
import {
    AttachmentFileSuffix,
    ECInvalidEmailAddress,
    ECNoValidMailReceiver,
    ECQueryBmailFailed,
    MsgType
} from "./consts";
import {BmailError, EventData, wrapResponse} from "./inject_msg";
import {AttachmentEncryptKey, loadAKForCompose, removeAttachmentKey} from "./content_attachment";

let __cur_email_address: string | null | undefined;

export const __decrypt_button_css_name = '.bmail-decrypt-btn'

export interface ContentPageProvider {
    readCurrentMailAddress(): string;

    prepareContent(): Promise<void>

    processAttachmentDownload(filePath?: string, attachmentData?: any): Promise<void>
}

function bmailInboxAction() {
    console.log("------>>> bmail inbox")
    browser.runtime.sendMessage({action: MsgType.BMailInbox}).catch((error: any) => {
        console.warn('------>>>error sending message:', error);
    });
}

export function setupEmailAddressByInjection(eventData: EventData) {
    const email = eventData.params?.email
    let result: any;
    if (!email || !isValidEmail(email)) {
        result = new BmailError(ECInvalidEmailAddress, "email address is invalid")
    } else {
        __cur_email_address = email
        console.log("------>>>setup email address success:=>", email);
        result = {success: true}
    }
    return wrapResponse(eventData.id, eventData.type, result, false);
}

export function parseBmailInboxBtn(template: HTMLTemplateElement, inboxDivStr: string) {
    const bmailInboxBtn = template.content.getElementById(inboxDivStr);
    if (!bmailInboxBtn) {
        console.log("------>>>failed to find bmailElement");
        return null;
    }

    const img = bmailInboxBtn.querySelector('img');
    if (img) {
        img.src = browser.runtime.getURL('file/logo_48.png');
    }
    const clone = bmailInboxBtn.cloneNode(true) as HTMLElement;
    clone.addEventListener('click', bmailInboxAction);
    return clone;
}

export function parseCryptoMailBtn(template: HTMLTemplateElement, imgSrc: string, btnClass: string,
                                   title: string, elmId: string, action: (btn: HTMLElement) => Promise<void>) {
    const cryptoBtnDiv = template.content.getElementById(elmId);
    if (!cryptoBtnDiv) {
        console.log("------>>>failed to find bmailElement");
        return null;
    }
    const img = cryptoBtnDiv.querySelector('img');
    if (img) {
        img.src = browser.runtime.getURL(imgSrc);
    }
    const clone = cryptoBtnDiv.cloneNode(true) as HTMLElement;
    const cryptoBtn = clone.querySelector(btnClass) as HTMLElement;
    cryptoBtn.textContent = title;
    clone.addEventListener('click', async (event) => {
        event.stopPropagation();
        await action(cryptoBtn);
    });
    return clone;
}

export function showTipsDialog(title: string, message: string, callback?: () => Promise<void>) {
    const dialog = document.getElementById("bmail_dialog_container");
    if (!dialog) {
        return;
    }
    dialog.querySelector(".bmail_dialog_title")!.textContent = title;
    dialog.querySelector(".bmail_dialog_message")!.textContent = message;
    if (callback) {
        dialog.querySelector(".bmail_dialog_button")?.addEventListener("click", async () => {
            await callback();
        })
    }
    dialog.style.display = "block";
}


export function checkFrameBody(fBody: HTMLElement, btn: HTMLElement) {
    let textContent = fBody.textContent?.trim();
    if (!textContent || textContent.length <= 0) {
        console.log("------>>> no mail content to judge");
        return;
    }

    if (textContent.includes(MailFlag)) {
        fBody.dataset.mailHasEncrypted = 'true';
        setBtnStatus(true, btn);
        fBody.contentEditable = 'false';
        console.log("change to decrypt model....")
    } else {
        fBody.dataset.mailHasEncrypted = 'false';
        setBtnStatus(false, btn);
        fBody.contentEditable = 'true';
        console.log("change to encrypt model....")
    }
}

export function setBtnStatus(hasEncrypted: boolean, btn: HTMLElement) {
    let img = (btn.parentNode as HTMLImageElement | null)?.querySelector('img') as HTMLImageElement | null;
    if (!img) {
        console.log("------>>>logo element not found");
        return;
    }
    if (hasEncrypted) {
        btn.dataset.encoded = 'true';
        btn.textContent = browser.i18n.getMessage('decrypt_mail_body');
        img!.src = browser.runtime.getURL('file/logo_48_out.png');
    } else {
        btn.dataset.encoded = 'false';
        btn.textContent = browser.i18n.getMessage('crypto_and_send');
        img!.src = browser.runtime.getURL('file/logo_48.png');
    }
}

export async function encryptMailInComposing(mailBody: HTMLElement, receiver: string[] | null, aekId?: string): Promise<boolean> {
    if (!receiver || receiver.length === 0) {
        return false;
    }

    let bodyTextContent = mailBody.textContent?.trim();
    if (!bodyTextContent || bodyTextContent.length <= 0) {
        showTipsDialog("Tips", browser.i18n.getMessage("encrypt_mail_body"));
        return false;
    }

    //TODO::duplicate encrypt mail content
    if (mailBody.innerHTML.includes(MailFlag)) {
        return true;
    }

    let attachment;
    if (aekId) {
        attachment = loadAKForCompose(aekId);
    }

    const mailRsp = await browser.runtime.sendMessage({
        action: MsgType.EncryptData,
        receivers: receiver,
        data: mailBody.innerHTML,
        attachment: attachment
    })

    if (mailRsp.success <= 0) {
        if (mailRsp.success === 0) {
            return false;
        }
        showTipsDialog("Tips", mailRsp.message);
        return false;
    }
    mailBody.innerHTML = '<div class="bmail-encrypted-data-wrapper">' + mailRsp.data + '</div>';

    if (aekId) {
        removeAttachmentKey(aekId);
    }
    return true;
}

export async function decryptMailInReading(mailContent: HTMLElement, cryptoBtn: HTMLElement): Promise<void> {
    showLoading();
    try {
        const statusRsp = await sendMessageToBackground('', MsgType.CheckIfLogin)
        if (statusRsp.success < 0) {
            return;
        }
        if (mailContent.dataset && mailContent.dataset.hasDecrypted === 'true') {
            mailContent.innerHTML = mailContent.dataset.orignCrpted!;
            mailContent.dataset.hasDecrypted = "false";
            mailContent.removeAttribute('data-orign-crpted');
            setBtnStatus(true, cryptoBtn);
            return;
        }

        mailContent.dataset.orignCrpted = mailContent.innerHTML;

        if (mailContent.innerHTML.includes('<wbr>')) {
            mailContent.innerHTML = mailContent.innerHTML.replace(/<wbr>/g, '');
        }

        const bmailContent = extractJsonString(mailContent.innerHTML);
        if (!bmailContent) {
            showTipsDialog("Error", browser.i18n.getMessage('decrypt_mail_body_failed'));
            return;
        }

        const mailRsp = await browser.runtime.sendMessage({
            action: MsgType.DecryptData,
            data: bmailContent.json
        })

        if (mailRsp.success <= 0) {
            if (mailRsp.success === 0) {
                return;
            }
            showTipsDialog("Tips", mailRsp.message);
            return;
        }
        mailContent.innerHTML = replaceTextInRange(mailContent.innerHTML, bmailContent.offset, bmailContent.endOffset, mailRsp.data);
        mailContent.dataset.hasDecrypted = "true";
        setBtnStatus(false, cryptoBtn);

        if (mailRsp.attachment) {
            const attachmentKey = AttachmentEncryptKey.fromJson(mailRsp.attachment);
            attachmentKey.cacheAkForReading();
        }

    } catch (error) {
        console.log("------>>>failed to decrypt mail data in reading:=>", error);
    } finally {
        hideLoading();
    }
}

function observeAction(target: HTMLElement, idleThreshold: number,
                       foundFunc: () => HTMLElement | null, callback: () => Promise<void>,
                       options: MutationObserverInit, continueMonitor?: boolean) {
    const cb: MutationCallback = (_, observer) => {
        const element = foundFunc();
        if (!element) {
            return;
        }
        if (!continueMonitor) {
            observer.disconnect();
        }
        let idleTimer = setTimeout(() => {
            callback().then();
            clearTimeout(idleTimer);
            // console.log('---------->>> observer action finished:=> continue=>', continueMonitor);
        }, idleThreshold);
    };

    const observer = new MutationObserver(cb);
    observer.observe(target, options);
}

export function observeForElement(target: HTMLElement, idleThreshold: number,
                                  foundFunc: () => HTMLElement | null, callback: () => Promise<void>,
                                  continueMonitor?: boolean) {

    observeAction(target, idleThreshold, foundFunc, callback, {childList: true, subtree: true}, continueMonitor);
}

export function observeForElementDirect(target: HTMLElement, idleThreshold: number,
                                        foundFunc: () => HTMLElement | null, callback: () => Promise<void>,
                                        continueMonitor?: boolean) {
    observeAction(target, idleThreshold, foundFunc, callback, {childList: true, subtree: false}, continueMonitor);
}


export let __localContactMap = new Map<string, string>();

export async function queryContactFromSrv(emailToQuery: string[], receiver: string[]): Promise<string[] | null> {

    if (emailToQuery.length <= 0) {
        if (receiver.length <= 0) {
            showTipsDialog("Tips", browser.i18n.getMessage("encrypt_mail_receiver"));
            return null;
        }
        return receiver;
    }

    const mailRsp = await sendMessageToBackground(emailToQuery, MsgType.EmailAddrToBmailAddr);
    if (!mailRsp || mailRsp.success === 0) {
        return null;
    }

    if (mailRsp.success < 0) {
        showTipsDialog("Warning", "no blockchain address for:" + emailToQuery);
        return null;
    }

    const invalidReceiver: string[] = []
    const contacts = mailRsp.data as EmailReflects;
    for (let i = 0; i < emailToQuery.length; i++) {
        const email = emailToQuery[i];
        const contact = contacts.reflects[email];
        if (!contact || !contact.address) {
            invalidReceiver.push(email);
            continue;
        }
        __localContactMap.set(email, contact.address);
        receiver.push(contact.address);
        console.log("----->>>from server email address:", email, "bmail address:", contact.address);
    }
    if (invalidReceiver.length > 0) {
        showTipsDialog("Warning", "no blockchain address found for email:" + invalidReceiver);
        return null;
    }

    return receiver;
}

export function appendDecryptForDiv(cryptoBtnDiv: HTMLElement, mailArea: HTMLElement) {
    const cryptoBtn = cryptoBtnDiv.querySelector(__decrypt_button_css_name) as HTMLElement;

    cryptoBtnDiv!.addEventListener('click', async () => {
        let BMailDivs: HTMLElement[];
        if (!cryptoBtn.dataset.encoded || cryptoBtn.dataset.encoded === 'true') {
            const decryptedDivs = mailArea.querySelectorAll('div[data-orign-crpted]');
            const nonEmptyDivs = Array.from(decryptedDivs).filter(div => {
                const attrValue = div.getAttribute('data-orign-crpted');
                return attrValue !== null && attrValue.length > 0;
            });
            if (nonEmptyDivs.length == 0) {
                BMailDivs = EncryptedMailDivSearch(mailArea) as HTMLElement[];
            } else {
                BMailDivs = nonEmptyDivs as HTMLElement[];
            }
        } else {
            const decryptedDivs = mailArea.querySelectorAll('div[data-has-decrypted="true"]');
            BMailDivs = Array.from(decryptedDivs) as HTMLElement[];
        }

        BMailDivs.forEach(bmailBody => {
            decryptMailInReading(bmailBody, cryptoBtn).then();
        });
    });
}

export function addDecryptButtonForBmailBody(template: HTMLTemplateElement, mailArea: HTMLElement, btnId: string): HTMLElement | null {

    let BMailDivs = EncryptedMailDivSearch(mailArea) as HTMLElement[];
    if (BMailDivs.length <= 0) {
        console.log("------>>> no bmail content found");
        return null;
    }

    const title = browser.i18n.getMessage('decrypt_mail_body')
    const cryptoBtnDiv = parseCryptoMailBtn(template, 'file/logo_48_out.png', __decrypt_button_css_name,
        title, btnId, async _ => {
        }) as HTMLElement;

    appendDecryptForDiv(cryptoBtnDiv, mailArea);
    return cryptoBtnDiv;
}

export async function parseEmailToBmail(emails: string[]): Promise<string[]> {
    let receiver: string[] = [];
    let emailToQuery: string[] = [];

    if (emails.length <= 0) {
        throw new BmailError(ECNoValidMailReceiver, "no valid email address to query")
    }

    for (let i = 0; i < emails.length; i++) {
        const email = emails[i];
        const address = __localContactMap.get(email);
        if (address) {
            receiver.push(address);
            console.log("------>>> from cache:", email, " address:=>", address);
            continue;
        }
        emailToQuery.push(email);
    }

    if (emailToQuery.length <= 0) {
        return receiver;
    }

    const mailRsp = await sendMessageToBackground(emailToQuery, MsgType.EmailAddrToBmailAddr);
    if (mailRsp.success < 0) {
        throw new BmailError(ECQueryBmailFailed, "failed to query bmail address by email address")
    }

    const contacts = mailRsp.data as EmailReflects;
    for (let i = 0; i < emailToQuery.length; i++) {
        const email = emailToQuery[i];
        const contact = contacts.reflects[email];
        if (!contact || !contact.address) {
            throw new BmailError(ECQueryBmailFailed, "no valid bmail address for:" + email);
        }

        __localContactMap.set(email, contact.address);
        receiver.push(contact.address);
    }

    return receiver;
}

export async function processReceivers(allEmailAddressDiv: NodeListOf<HTMLElement>, callback: (div: HTMLElement) => string | null): Promise<string[] | null> {
    const statusRsp = await sendMessageToBackground('', MsgType.CheckIfLogin)
    if (statusRsp.success < 0) {
        return null;
    }

    let receiver: string[] = [];
    let emailToQuery: string[] = [];

    const currentEmailAddress = readCurrentMailAddress();
    const mailRsp = await sendMessageToBackground(currentEmailAddress, MsgType.IfBindThisEmail);
    if (!mailRsp || mailRsp.success === 0) {
        return null;
    }

    if (mailRsp.success < 0) {
        showTipsDialog("Warning", mailRsp.message, async () => {
            await sendMessageToBackground('', MsgType.OpenPlugin);
        });
        return null;
    }

    // console.log("----->>> current email address:=>", currentEmailAddress);

    if (!allEmailAddressDiv || allEmailAddressDiv.length <= 0) {
        showTipsDialog("Tips", browser.i18n.getMessage("encrypt_mail_receiver"));
        return null;
    }
    for (let i = 0; i < allEmailAddressDiv.length; i++) {
        const emailAddressDiv = allEmailAddressDiv[i] as HTMLElement;
        const email = callback(emailAddressDiv)
        if (!email || email === "") {
            showTipsDialog("Tips", emailAddressDiv.innerText.trim() + " is not valid email address")
            return null;
        }
        console.log("------>>> email address found:", email);

        const address = __localContactMap.get(email);
        if (address) {
            receiver.push(address);
            console.log("------>>> from cache:", email, " address:=>", address);
            continue;
        }
        emailToQuery.push(email);
    }

    return queryContactFromSrv(emailToQuery, receiver);
}

export function observeFrame(
    iframe: HTMLIFrameElement,
    action: (doc: Document) => Promise<void>,
    interval = 1000,
) {
    let lastURL = '';
    setInterval(async function () {
        try {
            const currentURL = iframe.contentWindow?.location.href as string;
            if (currentURL === lastURL) {
                return;
            }
            lastURL = currentURL;
            if (!currentURL.includes("cgi-bin/readmail")) {
                return;
            }
            setTimeout(async () => {
                await action(iframe.contentDocument as Document);
            }, 1000);
        } catch (e) {
            console.log('------------>>>>Iframe URL error :=>', e);
        }
    }, interval);  // 每秒检查一次
}

export function replaceTextNodeWithDiv(firstChild: HTMLElement) {
    if (firstChild?.nodeType !== Node.TEXT_NODE) {
        return;
    }
    const textContent = firstChild.nodeValue;
    if (!textContent) {
        return;
    }
    const regex = /<div class="bmail-encrypted-data-wrapper">(.*?)<\/div>/;
    const match = textContent.match(regex);

    if (!match || !match[1]) {
        return
    }
    const extractedContent = match[1];
    const newDiv = document.createElement('div');
    newDiv.className = 'bmail-encrypted-data-wrapper';
    newDiv.innerHTML = extractedContent;
    firstChild?.parentNode?.replaceChild(newDiv, firstChild);
}

export function processInitialTextNodesForGoogle(mailArea: HTMLElement) {
    let content = '';
    let nodesToRemove: ChildNode[] = [];

    for (let i = 0; i < mailArea.childNodes.length; i++) {
        const node = mailArea.childNodes[i];

        if (node.nodeType !== Node.TEXT_NODE && node.nodeName !== 'WBR') {
            break;
        }
        if (node.nodeType === Node.TEXT_NODE) {
            content += node.nodeValue?.trim();
        }
        nodesToRemove.push(node);
    }

    if (!content.includes('<div class="bmail-encrypted-')) {
        return;
    }
    const convertedHTML = content.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const newDiv = document.createElement('div');
    newDiv.innerHTML = convertedHTML;
    nodesToRemove.forEach(node => mailArea.removeChild(node));
    mailArea.insertBefore(newDiv, mailArea.firstChild);
}

export function findAllTextNodesWithEncryptedDiv(mailArea: HTMLElement): Node[] {
    const walker = document.createTreeWalker(mailArea, NodeFilter.SHOW_TEXT);

    let currentNode: Node | null = walker.nextNode();
    const matchingNodes: Node[] = [];

    while (currentNode) {
        if (currentNode.nodeValue?.includes('<div class="bmail-encrypted-data-wrapper">')) {
            matchingNodes.push(currentNode);
        }
        currentNode = walker.nextNode();
    }

    return matchingNodes;
}

export async function decryptMailForEditionOfSentMail(originalTxtDiv: HTMLElement) {
    const statusRsp = await sendMessageToBackground('', MsgType.CheckIfLogin)
    if (statusRsp.success < 0) {
        return;
    }
    const bmailContent = extractJsonString(originalTxtDiv.innerHTML);
    if (!bmailContent) {
        return;
    }

    const mailRsp = await browser.runtime.sendMessage({
        action: MsgType.DecryptData,
        data: bmailContent.json
    });
    if (mailRsp.success <= 0) {
        return;
    }

    originalTxtDiv.innerHTML = replaceTextInRange(originalTxtDiv.innerHTML, bmailContent.offset, bmailContent.endOffset, mailRsp.data);
    if (mailRsp.attachment) {
        const attachmentKey = AttachmentEncryptKey.fromJson(mailRsp.attachment);
        attachmentKey.cacheAkForReading();
    }
}

export async function parseContentHtml(htmlFilePath: string): Promise<HTMLTemplateElement> {
    const response = await fetch(browser.runtime.getURL(htmlFilePath));
    if (!response.ok) {
        throw new Error(`Failed to fetch ${htmlFilePath}: ${response.statusText}`);
    }
    const htmlContent = await response.text();
    const template = document.createElement('template');
    template.innerHTML = htmlContent;
    return template;
}

export function readCurrentMailAddress(): string {
    const provider: ContentPageProvider = (window as any).contentPageProvider;
    if (provider && typeof provider.readCurrentMailAddress === 'function') {
        return provider.readCurrentMailAddress();
    } else {
        console.log("------------>>> no valid mail address providers", __cur_email_address);
        return __cur_email_address ?? "";
    }
}


export function showCustomModal(
    tips: string,
    okTxt: string,
    noTxt: string,
    okFun?: () => void,
    noFun?: () => void
) {
    const modal = document.getElementById('dialog-confirm-container') as HTMLElement;

    const tipsElement = document.getElementById('dialog-confirm-tips') as HTMLElement;
    const okButton = document.getElementById('dialog-confirm-ok') as HTMLButtonElement;
    const noButton = document.getElementById('dialog-confirm-no') as HTMLButtonElement;
    const closeButton = modal.querySelector('.dialog-confirm-close-button') as HTMLElement;

    tipsElement.textContent = tips;
    okButton.textContent = okTxt;
    noButton.textContent = noTxt;

    modal.style.display = 'block';

    okButton.onclick = null;
    noButton.onclick = null;
    closeButton.onclick = null;

    okButton.onclick = () => {
        modal.style.display = 'none';
        if (okFun) {
            okFun();
        }
    };

    noButton.onclick = () => {
        modal.style.display = 'none';
        if (noFun) {
            noFun();
        }
    };

    closeButton.onclick = () => {
        modal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

export class AttachmentKeyID {
    id: string;
    originalFileName: string;

    constructor(id: string, origFileName: string) {
        this.id = id;
        this.originalFileName = origFileName;
    }
}

export function extractAesKeyId(fileName?: string | null | undefined): AttachmentKeyID | null {
    if (!fileName) {
        return null;
    }
    const suffixWithUnderscore = "_" + AttachmentFileSuffix;

    if (!fileName.endsWith(suffixWithUnderscore)) {
        return null;
    }

    const fileNameWithoutSuffix = fileName.substring(0, fileName.length - suffixWithUnderscore.length);

    const lastDotIndex = fileNameWithoutSuffix.lastIndexOf(".");
    if (lastDotIndex === -1) {
        return null;
    }

    const id = fileNameWithoutSuffix.substring(lastDotIndex + 1);
    const originalFileName = fileNameWithoutSuffix.substring(0, lastDotIndex);

    if (!id || !originalFileName) {
        return null;
    }

    return new AttachmentKeyID(id, originalFileName);
}

export function addCustomStyles(cssFilePath: string): void {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = browser.runtime.getURL(cssFilePath);
    document.head.appendChild(link);
}