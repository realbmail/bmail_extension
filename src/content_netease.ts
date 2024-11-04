import browser from "webextension-polyfill";
import {
    __decrypt_button_css_name, addCustomStyles,
    addDecryptButtonForBmailBody,
    checkFrameBody,
    decryptMailForEditionOfSentMail,
    encryptMailInComposing, extractAesKeyId,
    findAllTextNodesWithEncryptedDiv,
    ContentPageProvider,
    observeForElementDirect,
    parseBmailInboxBtn,
    parseContentHtml,
    parseCryptoMailBtn,
    processReceivers,
    replaceTextNodeWithDiv,
    showTipsDialog
} from "./content_common";
import {extractEmail, hideLoading, showLoading} from "./utils";
import {addAttachmentEncryptBtn, decryptAttachment, loadAKForReading} from "./content_attachment";

function appendForNetEase(template: HTMLTemplateElement) {
    const clone = parseBmailInboxBtn(template, "bmail_left_menu_btn_netEase");
    if (!clone) {
        console.warn("------>>> failed to parse bmail inbox button");
        return
    }

    appendBmailInboxMenu(clone);
    checkBmailInboxMenuAgain(clone);
    checkHasMailContent(template);

    const dvContainer = document.getElementById("dvContainer") as HTMLElement;
    observeForElementDirect(dvContainer, 500, () => {
        return document.querySelector("[id^='_dvModuleContainer_read.ReadModule']") as HTMLElement;
    }, async () => {
        checkHasMailContent(template);
    }, true);

    monitorTabMenu((isDelete: boolean) => {
        if (isDelete) {
            //TODO::
            return;
        }
        checkHasMailContent(template);
    });
}

function checkBmailInboxMenuAgain(clone: HTMLElement): void {

    const checkBmailMenuAgain = () => {
        const dynamicBtn = document.getElementById('bmail_left_menu_btn_netEase');
        if (!dynamicBtn) {
            appendBmailInboxMenu(clone)
        }
    }

    const homePageMenu = document.querySelector('li[id^="_mail_tabitem_0_"]');
    if (homePageMenu) {
        homePageMenu.addEventListener('click', checkBmailMenuAgain);
    }

    const inboxMenu = document.querySelector('li[id^="_mail_tabitem_8_"]');
    if (inboxMenu) {
        inboxMenu.addEventListener('click', checkBmailMenuAgain);
    }
}

function checkHasMailContent(template: HTMLTemplateElement) {
    let debounceTimer = setTimeout(() => {

        const composeDiv = document.querySelectorAll<HTMLElement>("[id^='_dvModuleContainer_compose.ComposeModule']");
        composeDiv.forEach(div => {
            prepareComposeEnv(div, template).then();
            prepareAttachmentForCompose(div, template);
        });

        clearTimeout(debounceTimer);
        const readDiv = document.querySelectorAll<HTMLElement>("[id^='_dvModuleContainer_read.ReadModule']");
        readDiv.forEach(div => {
            addMailDecryptForReadingNetease(div, template);
            addEncryptBtnForQuickReply(div, template);
            addDecryptBtnForAttachment(div, template);
            // checkAttachmentBeforeForwardMail(div);
        });
    }, 1500);
}

function appendBmailInboxMenu(clone: HTMLElement) {
    const ulElements = document.querySelectorAll('ul[id^="_mail_tree_0_"]');

    const targetElement = Array.from(ulElements).find((element) => {
        return window.getComputedStyle(element).display !== 'none';
    });
    if (!targetElement) {
        console.log("failed to find target element");
        return;
    }

    if (targetElement.children.length >= 2) {
        targetElement.insertBefore(clone, targetElement.children[1]);
    } else {
        targetElement.appendChild(clone);
    }
}

function queryEmailAddrNetEase() {
    const mailAddr = document.getElementById('spnUid');
    if (!mailAddr) {
        return null;
    }
    console.log("------>>>mail address:", mailAddr.textContent);
    return mailAddr.textContent;
}

async function parseMailBodyToCheckCryptoButtonStatus(composeDiv: HTMLElement, btn: HTMLElement) {
    const iframe = composeDiv.querySelector(".APP-editor-iframe") as HTMLIFrameElement;
    if (!iframe) {
        console.log('----->>> encrypt failed to find iframe:=>');
        return null;
    }
    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDocument) {
        console.log("----->>> no frame body found:=>");
        return null;
    }
    const nakedBmailTextDiv = findAllTextNodesWithEncryptedDiv(iframeDocument.body);
    nakedBmailTextDiv.forEach(wrappedDiv => {
        replaceTextNodeWithDiv(wrappedDiv as HTMLElement);
    })

    const mailEditAgainDiv = iframeDocument.querySelector('.bmail-encrypted-data-wrapper') as HTMLElement;
    if (mailEditAgainDiv) {
        const targetElement = mailEditAgainDiv.closest('#isReplyContent, #isForwardContent, .cm_quote_msg');
        if (!targetElement) {
            await decryptMailForEditionOfSentMail(mailEditAgainDiv);
            let nextSibling = mailEditAgainDiv.nextSibling;
            while (nextSibling && (nextSibling as HTMLElement).tagName === 'BR') {
                mailEditAgainDiv.appendChild(nextSibling);
                nextSibling = mailEditAgainDiv.nextSibling;
            }
            const editAreaDiv = document.createElement('div');
            editAreaDiv.id = 'spnEditorContent';
            editAreaDiv.append(mailEditAgainDiv);
            editAreaDiv.innerHTML += '<br><br><br>'
            iframeDocument.body.insertBefore(editAreaDiv, iframeDocument.body.firstChild);
        }
    }

    const replyOrForwardDiv = iframeDocument.querySelector('#isReplyContent, #isForwardContent, .cm_quote_msg') as HTMLQuoteElement | null;
    if (!replyOrForwardDiv) {
        checkFrameBody(iframeDocument.body, btn);
        return;
    }
    iframeDocument.body.dataset.theDivIsReply = 'true';
    let div = iframeDocument.getElementById('spnEditorContent') as HTMLElement;
    checkFrameBody(div, btn);
}

async function prepareComposeEnv(composeDiv: HTMLElement, template: HTMLTemplateElement) {
    let cryptoBtn = composeDiv.querySelector('.bmail-crypto-btn') as HTMLElement;
    if (cryptoBtn) {
        console.log("------>>> crypto btn already been added before for mail composing");
        await parseMailBodyToCheckCryptoButtonStatus(composeDiv, cryptoBtn);
        return;
    }
    const headerBtnList = composeDiv.querySelector(".js-component-toolbar.nui-toolbar");
    if (!headerBtnList) {
        console.log("------>>> header list not found for mail composition");
        return;
    }
    const title = browser.i18n.getMessage('crypto_and_send');
    const sendDiv = composeDiv.querySelector(".js-component-button.nui-mainBtn.nui-btn.nui-btn-hasIcon.nui-mainBtn-hasIcon") as HTMLElement;
    const cryptoBtnDiv = parseCryptoMailBtn(template, 'file/logo_48.png', ".bmail-crypto-btn",
        title, 'bmail_crypto_btn_in_compose_netEase', async _ => {
            await encryptDataAndSendNetEase(composeDiv, sendDiv);
        }
    ) as HTMLElement;

    await parseMailBodyToCheckCryptoButtonStatus(composeDiv, cryptoBtnDiv.querySelector('.bmail-crypto-btn') as HTMLElement);
    headerBtnList.insertBefore(cryptoBtnDiv, headerBtnList.children[1]);
    // console.log("------>>> encrypt button add success");
}

function prepareAttachmentForCompose(composeDiv: HTMLElement, template: HTMLTemplateElement) {
    const overlayButton = template.content.getElementById('attachmentEncryptBtnNetease') as HTMLButtonElement | null;
    if (!overlayButton) {
        console.log("----->>> overlayButton not found");
        return;
    }
    const attachmentDiv = composeDiv.querySelector('div[id$="_attachOperate"]') as HTMLInputElement;
    const fileInput = attachmentDiv?.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (!fileInput) {
        console.log("----->>> file input not found");
        return;
    }

    if (attachmentDiv.querySelector(".attachmentEncryptBtnNetease")) {
        console.log("----->>> overly button already added before for mail composing");
        return;
    }

    overlayButton.innerText = browser.i18n.getMessage('bmail_attachment_encrypt_btn');
    let aekID;
    const iframe = composeDiv.querySelector(".APP-editor-iframe") as HTMLIFrameElement | null;
    let mailDoc = iframe?.contentDocument || iframe?.contentWindow?.document;
    const isForward = mailDoc?.querySelector('div[id="isForwardContent"]');
    if (!isForward) {
        aekID = findAttachmentKeyID(composeDiv);
    }
    const overlyClone = overlayButton.cloneNode(true) as HTMLElement;
    addAttachmentEncryptBtn(fileInput, overlyClone, aekID);
    attachmentDiv.appendChild(overlyClone);
}


function findAttachmentKeyID(composeDiv: HTMLElement): string | undefined {
    const attachArea = composeDiv.querySelector('div[id$="_attachContent"]') as HTMLElement;
    const allAttachDivs = attachArea.querySelectorAll(".G0");
    if (allAttachDivs.length === 0) {
        return undefined;
    }

    let aekId = "";
    for (let i = 0; i < allAttachDivs.length; i++) {
        const element = allAttachDivs[i];
        const fileName = element.querySelector(".o0")?.textContent;
        const parsedId = extractAesKeyId(fileName);
        if (!parsedId) {
            continue;
        }
        if (parsedId.id > aekId) {
            aekId = parsedId.id;
        }
    }

    return aekId;
}

async function encryptDataAndSendNetEase(composeDiv: HTMLElement, sendDiv: HTMLElement) {

    showLoading();
    try {
        const iframe = composeDiv.querySelector(".APP-editor-iframe") as HTMLIFrameElement | null;
        let mailBody = iframe?.contentDocument?.body || iframe?.contentWindow?.document.body;
        if (!mailBody) {
            console.log("----->>> no frame body found:=>");
            return null;
        }

        if (mailBody.dataset.theDivIsReply === 'true') {
            mailBody = iframe?.contentDocument?.getElementById('spnEditorContent') as HTMLElement;
        }

        const receiverArea = composeDiv.querySelectorAll(".js-component-emailblock") as NodeListOf<HTMLElement>;
        const receiver = await processReceivers(receiverArea, (div) => {
            const emailElement = div.querySelector(".nui-addr-email");
            if (!emailElement) {
                return null;
            }
            return extractEmail(div.textContent ?? "");
        });

        const aekId = findAttachmentKeyID(composeDiv);
        const success = await encryptMailInComposing(mailBody, receiver, aekId);
        if (!success) {
            return;
        }
        sendDiv.click();
    } catch (err) {
        console.log("------>>> mail crypto err:", err);
        showTipsDialog("error", "encrypt mail content failed");
    } finally {
        hideLoading();
    }
}

function monitorTabMenu(callback?: (isDelete: boolean) => void) {
    const ul = document.querySelector('.js-component-tab.tz0.nui-tabs');
    if (!ul) {
        console.log("------>>>no tab menu found")
        return;
    }
    let lastChildCount = ul.children.length;
    const observer = new MutationObserver((mutationsList) => {
        const currentChildCount = ul.children.length;
        let isDelete = true;
        if (currentChildCount !== lastChildCount) {
            if (currentChildCount > lastChildCount) {
                isDelete = false;
            } else {
                mutationsList.forEach(mutation => {
                    mutation.removedNodes.forEach(node => {
                        if (node.nodeName === 'LI') {
                            console.log(`------>>>Removed li:`);
                        }
                    });
                });
            }
            lastChildCount = currentChildCount;
            if (callback) {
                callback(isDelete);
            }
        }
    });
    observer.observe(ul, {childList: true});
}

function addMailDecryptForReadingNetease(composeDiv: HTMLElement, template: HTMLTemplateElement) {

    const decryptBtn = composeDiv.querySelector(__decrypt_button_css_name) as HTMLElement;
    if (decryptBtn) {
        console.log("------>>> decrypt button already been added for reading");
        return;
    }

    const iframe = composeDiv.querySelector("iframe") as HTMLIFrameElement | null;
    const iframeDocument = iframe?.contentDocument || iframe?.contentWindow?.document;
    if (!iframeDocument) {
        console.log("----->>> no mail body found:=>");
        return;
    }

    const headerBtnList = composeDiv.querySelector(".js-component-toolbar.nui-toolbar") as HTMLElement | null;
    if (!headerBtnList) {
        console.log("------>>> header list not found for netease mail reading");
        return;
    }

    const mailArea = iframeDocument.querySelector(".netease_mail_readhtml.netease_mail_readhtml_webmail") as HTMLElement | null;
    if (!mailArea) {
        let debounceTimer = setTimeout(() => {
            checkHasMailContent(template);
            clearTimeout(debounceTimer);
        }, 1500);
        return;
    }

    const nakedBmailTextDiv = findAllTextNodesWithEncryptedDiv(iframeDocument.body);
    nakedBmailTextDiv.forEach(wrappedDiv => {
        replaceTextNodeWithDiv(wrappedDiv as HTMLElement);
    })

    const cryptoBtnDiv = addDecryptButtonForBmailBody(template, mailArea, 'bmail_decrypt_btn_in_compose_netEase');
    if (!cryptoBtnDiv) {
        return;
    }

    headerBtnList.insertBefore(cryptoBtnDiv, headerBtnList.children[1]);
}

function addEncryptBtnForQuickReply(mailArea: HTMLElement, template: HTMLTemplateElement) {

    const quickReply = mailArea.querySelector('div[id$="_dvAttach_reply"]')
    if (!quickReply) {
        console.log("----->>> quick reply area not found");
        return;
    }

    const toolBarDiv = quickReply.querySelector('div[id$="_dvReplyBts"]') as HTMLElement
    if (!toolBarDiv) {
        console.log("----->>> tool bar in quick reply area not found");
        return;
    }
    const title = browser.i18n.getMessage('crypto_and_send');
    const mailBody = mailArea.querySelector('textarea[id$="_replyInput_inputId"]') as HTMLTextAreaElement;
    mailBody?.addEventListener('click', () => {
        let cryptoBtn = toolBarDiv.querySelector('.bmail-crypto-btn') as HTMLElement;
        if (cryptoBtn) {
            console.log("----->>> crypto button already been added for quick reply area");
            return;
        }

        const sendDiv = toolBarDiv.querySelector('div[role="button"]') as HTMLElement;
        const cryptoBtnDiv = parseCryptoMailBtn(template, 'file/logo_48.png', ".bmail-crypto-btn",
            title, 'bmail_crypto_btn_in_compose_netEase', async _ => {
                const emailDiv = mailArea.querySelectorAll('.nui-addr-email') as NodeListOf<HTMLElement>;
                const receiver = await processReceivers(emailDiv, (div) => {
                    return extractEmail(div?.textContent ?? "")
                });
                const success = await encryptDataAndSendForQuickReplyNetEase(mailBody, receiver, sendDiv);
                if (success) {
                    cryptoBtnDiv.parentNode?.removeChild(cryptoBtnDiv);
                }
            }
        ) as HTMLElement;

        toolBarDiv.insertBefore(cryptoBtnDiv, sendDiv);
    });
}

async function encryptDataAndSendForQuickReplyNetEase(mailBody: HTMLTextAreaElement, receiver: string[] | null, sendDiv: HTMLElement): Promise<boolean> {
    showLoading();
    try {
        mailBody.textContent = mailBody.value;
        const success = await encryptMailInComposing(mailBody, receiver);
        if (!success) {
            return false;
        }
        mailBody.value = mailBody.defaultValue;
        sendDiv.click();
        return true;
    } catch (e) {
        let err = e as Error;
        showTipsDialog("Warning", err.message);
        return false
    } finally {
        hideLoading();
    }
}

class Provider implements ContentPageProvider {
    readCurrentMailAddress(): string {
        return queryEmailAddrNetEase() ?? "";
    }

    async processAttachmentDownload(_fileName?: string, _attachmentData?: any): Promise<void> {
    }
}

function addDecryptBtnForAttachment(mailArea: HTMLElement, template: HTMLTemplateElement) {
    const ulElement = mailArea.querySelector('ul[id$="_ulCommonAttachItem"]') as HTMLUListElement | null;

    const attachmentDiv = ulElement?.querySelectorAll(".dM1 .ey0")
    if (!attachmentDiv || attachmentDiv.length === 0) {
        console.log("------>>>", "no attachment found");
        return;
    }

    for (let i = 0; i < attachmentDiv.length; i++) {
        const attachment = attachmentDiv[i] as HTMLElement;
        if (attachment.querySelector(".attachmentDecryptLink")) {
            continue;
        }

        const fileName = attachment.querySelector(".dn0 .cg0")?.textContent;
        const parsedId = extractAesKeyId(fileName);
        if (!parsedId) {
            console.log("------>>> no need to add decrypt button to this attachment element");
            continue;
        }

        const downloadLinkDiv = attachment.querySelector("a.js-component-link.cK0") as HTMLLinkElement;
        const url = downloadLinkDiv.href;
        if (!url) {
            console.log("------>>>", "failed to find download link of encrypted attachment");
            continue;
        }

        const cryptoBtnDiv = template.content.getElementById("attachmentDecryptLink") as HTMLElement;
        const clone = cryptoBtnDiv.cloneNode(true) as HTMLElement;
        clone.setAttribute('id', "");
        clone.querySelector(".cb1")!.textContent = browser.i18n.getMessage("bmail_attachment_decrypt");
        clone.addEventListener('click', async () => {
            await decryptAttachment(parsedId.id, url, parsedId.originalFileName);
        });

        attachment.insertBefore(clone, downloadLinkDiv);
    }
}

(window as any).contentPageProvider = new Provider();
document.addEventListener('DOMContentLoaded', async () => {
    addCustomStyles('css/netease.css');
    const template = await parseContentHtml('html/inject_netease.html');
    appendForNetEase(template);
    console.log("------>>> netease content init success");
});

function checkAttachmentBeforeForwardMail(mailArea: HTMLElement) {
    const decryptBtn = mailArea.querySelector(".bmail-crypto-btn-div");
    if (!decryptBtn) {
        console.log("------>>> no need to monitor forward action for this mail");
        return;
    }

    const forwardParent = decryptBtn.nextSibling as HTMLElement;
    if (!forwardParent || forwardParent.children.length <= 2) {
        console.warn("------>>> there should be the  forward parent node next to decrypt button", forwardParent);
        return;
    }

    const forwardBtn = forwardParent.children[2].firstElementChild as HTMLElement;
    if (!forwardBtn) {
        console.warn("------>>> forward button not found", forwardBtn);
        return;
    }
    if (forwardBtn.dataset.hasAddListener === 'true') {
        console.log("----->>> duplicate listen action for mail attachment")
        return;
    }

    const attachArea = mailArea.querySelector('div[id$="_dvAttach_reply"]') as HTMLElement;
    if (!attachArea) {
        console.log("------>>> no attachment in reply area");
        return;
    }

    forwardBtn.addEventListener("click", (e) => checkAttachmentBeforeForward(e, attachArea), true);
    forwardBtn.dataset.hasAddListener = 'true';
}

function checkAttachmentBeforeForward(e: MouseEvent, attachArea: HTMLElement) {
    const attachmentListDiv = attachArea.querySelector('ul[id$="_ulCommonAttachItem"]')

    const fileNameDivs = attachmentListDiv?.querySelectorAll('strong.dh0');
    if (!fileNameDivs || fileNameDivs.length === 0) {
        console.warn("------>>> no attachment file name found");
        return;
    }
    for (let i = 0; i < fileNameDivs.length; i++) {
        const fileNameDiv = fileNameDivs[i] as HTMLElement;
        const fileName = fileNameDiv.innerText;
        const parsedId = extractAesKeyId(fileName);
        if (!parsedId) {
            console.log("----->>> no need to check attachment key for file:", fileName);
            continue;
        }
        const attachmentKey = loadAKForReading(parsedId.id);
        if (!attachmentKey) {
            e.stopImmediatePropagation(); // 阻止其他事件处理器的执行
            showTipsDialog("Tips", "当前邮件需要先解密再转发！");//TODO::browser
            return;
        }

        attachmentKey.cacheAKForCompose();
    }
}