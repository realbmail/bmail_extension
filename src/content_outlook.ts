import {
    __decrypt_button_css_name,
    addCustomStyles,
    addDecryptButtonForBmailBody,
    appendDecryptForDiv,
    decryptMailInReading,
    encryptMailInComposing,
    extractAesKeyId,
    findAllTextNodesWithEncryptedDiv,
    ContentPageProvider,
    observeForElement,
    parseBmailInboxBtn,
    parseContentHtml,
    parseCryptoMailBtn,
    processReceivers,
    replaceTextNodeWithDiv,
    showTipsDialog,
    AttachmentKeyID,
    setKeepAlive,
    EncryptedMailDivSearch,
    removeBmailDownloadLink
} from "./content_common";
import browser from "webextension-polyfill";
import {
    extractEmail,
    hideLoading,
    moveParenthesesBeforeExtension,
    sendMessageToBackground,
    showLoading
} from "./utils";
import {MailFlag} from "./bmail_body";
import {addAttachmentEncryptBtn, decryptFile, loadAKForReading} from "./content_attachment";
import {AttachmentFileSuffix, ExtensionDownloadLink, MsgType} from "./consts";

function queryEmailAddrOutLook() {
    const element = document.getElementById("O365_AppName") as HTMLLinkElement | null;
    if (!element) return;
    console.log("-------->>> account info:", element.href);
    const url = element.href;
    const loginHintMatch = url.match(/login_hint=([^&]*)/);
    if (!loginHintMatch) {
        return;
    }
    const loginHint = decodeURIComponent(loginHintMatch[1]);
    console.log('----->>> email address found:', loginHint);
    return loginHint;
}

function appendForOutLook(template: HTMLTemplateElement) {

    observeForElement(document.body, 800,
        () => {
            return document.querySelector(".qQbyL .xKrjQ");
        }, async () => {
            appendBmailInboxMenuOutLook(template).then();
            monitorContactAction().then();
        });

    observeForElement(document.body, 800, () => {
        return document.getElementById("ReadingPaneContainerId")?.firstElementChild as HTMLElement;
    }, async () => {
        // console.log("------->>>start to populate outlook mail area");
        monitorMailAreaOutLook(template).then();
    });
}

const __nameToEmailMap = new Map();

function cacheContactContent(contactDiv: HTMLElement) {
    const ulElement = contactDiv.querySelector('ul.ms-FloatingSuggestionsList-container') as HTMLElement;
    if (!ulElement) {
        console.log("------>>>  contact list should not be null:", contactDiv);
        return;
    }

    const contactItems = ulElement.querySelectorAll("li");
    if (contactItems.length === 0) {
        console.log("------>>> contact list is empty")
        return;
    }

    for (let i = 0; i < contactItems.length; i++) {
        const contactItem = contactItems[i];

        const emailName = contactItem.querySelector('.MwdHX') as HTMLElement
        const emailAddress = contactItem.querySelector('.Umn8G.MwdHX') as HTMLElement;
        console.log('-------->>>name:', emailName, "------>>> address:", emailAddress);
        if (!emailName || !emailAddress) {
            console.log("------>>> need query later");
            setTimeout(() => {
                cacheContactContent(contactDiv);
            }, 500);
            break;
        }
        __nameToEmailMap.set(emailName.innerText.trim(), emailAddress.innerText.trim());
    }
}

async function monitorContactAction() {
    const div = document.getElementById("fluent-default-layer-host") as HTMLElement;
    let oldDiv: HTMLElement | null = null;
    // console.log("------>>> start to monitor contact list:", div);
    observeForElement(div, 300, () => {
        const ulElement = div.querySelector('ul.ms-FloatingSuggestionsList-container') as HTMLElement | null;
        if (oldDiv === ulElement) {
            return null;
        }
        oldDiv = ulElement;
        return ulElement;
    }, async () => {
        cacheContactContent(div);
    }, true);
}

async function appendBmailInboxMenuOutLook(template: HTMLTemplateElement) {
    const leftMenuDiv = document.querySelector(".qQbyL .xKrjQ") as HTMLElement;
    let clone = parseBmailInboxBtn(template, "bmail_left_menu_btn_outlook") as HTMLElement;
    if (leftMenuDiv.children.length >= 2) {
        leftMenuDiv.insertBefore(clone, leftMenuDiv.children[1]);
    } else {
        leftMenuDiv.appendChild(clone);
    }
}

async function monitorMailAreaOutLook(template: HTMLTemplateElement) {
    const monitorArea = document.getElementById("ReadingPaneContainerId")?.firstElementChild as HTMLElement;
    if (!monitorArea) {
        console.log("------>>> mail area failed ");
        return;
    }

    let oldDiv: HTMLElement | null = null;
    observeForElement(monitorArea, 800,
        () => {
            const editArea = document.querySelector("[id^='docking_InitVisiblePart_']") as HTMLElement | null;
            const readingNodes = document.querySelectorAll('.aVla3');
            const readArea = readingNodes[readingNodes.length - 1] as HTMLElement | null;
            // console.log("------>>> editArea area:", editArea, "readArea", readArea);
            const targetDiv = editArea || readArea;
            if (oldDiv === targetDiv) {
                return null;
            }
            oldDiv = targetDiv;
            // console.log("------>>> targetDiv area:", targetDiv);
            return targetDiv;
        }, async () => {
            // console.log("------->>>start to populate outlook mail area");
            addCryptButtonToComposeDivOutLook(template).then();
            addMailDecryptForReadingOutLook(template).then();
        }, true);
}

function monitorReceiverChanges(composeArea: HTMLElement) {
    const receiverTable = composeArea.querySelector(".___hhiv960.f22iagw.fly5x3f.f1fow5ox.f1l02sjl") as HTMLElement;
    if (!receiverTable) {
        console.log("----->>> this is not full page of mail composition");
        return
    }
    let currentReceiverNo = 0;
    observeForElement(receiverTable, 600, () => {
        const receivers = receiverTable.querySelectorAll("._EType_RECIPIENT_ENTITY") as NodeListOf<HTMLElement>;
        if (currentReceiverNo === receivers.length) {
            return null;
        }
        currentReceiverNo = receivers.length;
        return receivers[0];
    }, async () => {
        const receivers = receiverTable.querySelectorAll("._EType_RECIPIENT_ENTITY") as NodeListOf<HTMLElement>;
        // console.log("----->>> all nodes:", receivers);
        for (let i = 0; i < receivers.length; i++) {
            const div = receivers[i] as HTMLElement;
            const divTxt = div.innerText
            const emailAddr = extractEmail(divTxt);
            if (emailAddr) {
                continue;
            }
            const matchingSpans = div.querySelector('span[class^="textContainer-"], span[class^="individualText-"]') as HTMLElement;
            const emailName = matchingSpans.innerText.trim()
            console.log("------>>> receivers area found when compose mail=>", emailName, __nameToEmailMap.get(emailName));
        }
    }, true)
}

async function addCryptButtonToComposeDivOutLook(template: HTMLTemplateElement) {
    const composeArea = document.querySelector(".dMm6A") as HTMLElement;
    if (!composeArea) {
        console.log("------>>> no compose area found");
        return;
    }

    //vBoqL iLc1q cc0pa cF0pa tblbU zHv4R dP5Z2
    const toolBarDiv = composeArea.querySelector('div[data-testid="ComposeSendButton"]')?.parentNode as HTMLElement
    if (!toolBarDiv) {
        console.log("------>>> tool bar not found when compose mail");
        return;
    }

    removeBmailDownloadLink(composeArea);

    monitorReceiverChanges(composeArea);
    prepareAttachmentForCompose(composeArea, template);

    const cryptoBtn = toolBarDiv.querySelector(".bmail-crypto-btn") as HTMLElement;
    if (cryptoBtn) {
        console.log("------>>> node already exists");
        return;
    }

    const sendDiv = toolBarDiv.querySelector<HTMLButtonElement>('button[title*="+Enter)"]') as HTMLElement;
    const title = browser.i18n.getMessage('crypto_and_send');
    const cryptoBtnDiv = parseCryptoMailBtn(template, 'file/logo_48.png', ".bmail-crypto-btn",
        title, 'bmail_crypto_btn_in_compose_outlook', async _ => {
            await encryptMailAndSendOutLook(composeArea, sendDiv);
        }
    ) as HTMLElement;
    toolBarDiv.insertBefore(cryptoBtnDiv, toolBarDiv.children[1] as HTMLElement);
}

const __bmailComposeDivId = "bmail-mail-body-for-outlook";

async function encryptMailAndSendOutLook(composeArea: HTMLElement, sendDiv: HTMLElement) {
    showLoading();
    try {
        let mailBody = document.querySelector("[id^='editorParent_']")?.firstChild as HTMLElement;
        const allEmailAddrDivs = composeArea.querySelectorAll("._Entity._EType_RECIPIENT_ENTITY._EReadonly_1") as NodeListOf<HTMLElement>;
        let result = await processReceivers(allEmailAddrDivs, (div) => {
            const matchingSpans = div.querySelector('span[class^="textContainer-"], span[class^="individualText-"]') as HTMLElement;
            if (!matchingSpans) {
                const emailSpan = div.querySelector('span[aria-label]') as HTMLElement;
                let emailAddr = extractEmail(emailSpan.getAttribute('aria-label') ?? "");
                console.log("------>>> email address:", emailAddr);
                return emailAddr;
            }
            const nickName = matchingSpans.innerText.trim() ?? ""
            console.log("------>>> nick name:", nickName);
            let emailAddr = extractEmail(nickName);
            if (!emailAddr) {
                emailAddr = __nameToEmailMap.get(nickName);
                console.log("-------->>>>>>name:", nickName, "email:", emailAddr);
            }
            return emailAddr;
        });

        if (!result) {
            showTipsDialog("Tips", browser.i18n.getMessage("encrypt_mail_receiver"));
            return;
        }
        const {receiver, mailReceiver} = result;
        const replayArea = document.getElementById("divRplyFwdMsg");
        if (replayArea) {
            const div = document.createElement("div");
            div.classList.add(__bmailComposeDivId);
            mailBody.querySelectorAll(".elementToProof").forEach((subNode) => {
                div.appendChild(subNode);
            });
            mailBody.insertBefore(div, mailBody.firstChild as HTMLElement);
            mailBody = div;
        }

        const aekID = composeArea.dataset.attachmentKeyId ?? "";
        const success = await encryptMailInComposing(mailBody, receiver, aekID, mailReceiver);
        if (!success) {
            return;
        }
        sendDiv.click();
    } catch (e) {
        console.log("------>>> mail crypto err:", e);
        showTipsDialog("error", "encrypt mail content failed");
    } finally {
        hideLoading();
    }
}

async function addMailDecryptForReadingOutLook(template: HTMLTemplateElement) {
    const readArea = document.querySelector('div[data-app-section="ConversationContainer"]');
    if (!readArea) {
        console.log("------>>> no reading area found");
        return;
    }

    const editArea = document.querySelector("[id^='docking_InitVisiblePart_']") as HTMLElement | null;
    if (editArea) {
        await addCryptButtonToComposeDivOutLook(template);
        return;
    }

    const allInboxMailDiv = document.querySelectorAll('div.aVla3 div[aria-expanded]') as NodeListOf<HTMLElement>;
    console.log("------>>> reading area found", allInboxMailDiv.length);

    allInboxMailDiv.forEach((oneMail) => {
        const ariaExpandedValue = oneMail.getAttribute('aria-expanded');
        if (ariaExpandedValue === 'true') {
            if (oneMail.childNodes.length === 1) {
                prepareOpenedMail(oneMail, template);
            } else if (oneMail.childNodes.length === 2) {
                const historyMail = oneMail.childNodes[0] as HTMLElement;
                prepareMailHistory(historyMail, template);

                const openedMail = oneMail.childNodes[1] as HTMLElement;
                prepareOpenedMail(openedMail, template);
            } else {
                console.log("-------------->>>>should not come here [oneMail.childNodes]:", oneMail.childNodes)
            }
            return;
        }

        const moreMailDataBar = oneMail.querySelector(".Ts94W.allowTextSelection");
        moreMailDataBar?.addEventListener("click", () => {
            setTimeout(() => {
                prepareOpenedMail(oneMail, template);
            }, 1000);
        });

        const showMoreHistoryBtn = oneMail.querySelector(".cjx_B .cP5VY .CoT2h");
        showMoreHistoryBtn?.addEventListener("click", () => {
            const mailBody = showMoreHistoryBtn.closest(".wide-content-host") as HTMLElement;
            setTimeout(() => {
                prepareMailHistory(mailBody, template);
            }, 1000);
        })
    });
}

function prepareOpenedMail(oneMail: HTMLElement, template: HTMLTemplateElement) {
    const mailBody = oneMail.querySelector('div[id^="UniqueMessageBody_"]') as HTMLElement;
    const toolBarDiv = oneMail.querySelector('div[role="toolbar"]') as HTMLElement;
    if (!mailBody || !toolBarDiv) {

        const sendingMailTipsDiv = oneMail.querySelector('div[class="AL_OM l8Tnu"]');
        if (sendingMailTipsDiv) {
            setTimeout(() => {
                addMailDecryptForReadingOutLook(template).then();
            }, 1000);
        }
        console.log("------>>>> no mail body or tool bar in opened mail", mailBody, toolBarDiv);
        return;
    }

    const decryptBtn = toolBarDiv.querySelector(__decrypt_button_css_name) as HTMLElement;
    if (decryptBtn) {
        console.log("------>>> decrypt button already been added for reading");
        return;
    }

    const nakedBmailTextDiv = findAllTextNodesWithEncryptedDiv(mailBody);
    nakedBmailTextDiv.forEach(wrappedDiv => {
        replaceTextNodeWithDiv(wrappedDiv as HTMLElement);
    })
    let cryptoBtnDiv = addDecryptButtonForBmailBody(template, mailBody, 'bmail_decrypt_btn_in_compose_outlook');
    if (cryptoBtnDiv) {
        toolBarDiv.insertBefore(cryptoBtnDiv, toolBarDiv.children[1]);
    }
    const moreMailContentBtn = oneMail.querySelector(".T_6Xj");
    moreMailContentBtn?.addEventListener("click", () => {
        setTimeout(() => {
            showMoreMailContent(oneMail, toolBarDiv, template, cryptoBtnDiv);
        }, 500);
    })

    setTimeout(() => {
        addDecryptBtnForAttachment(oneMail, template);
    }, 500);
}

function showMoreMailContent(oneMail: HTMLElement, toolBarDiv: HTMLElement, template: HTMLTemplateElement, cryptoBtnDiv?: HTMLElement | null) {
    const quoteOrReply = oneMail.querySelector(".wnVEW")?.querySelector('div[role="document"]') as HTMLElement;
    if (!quoteOrReply) {
        return;
    }

    removeBmailDownloadLink(quoteOrReply);

    const nakedBmailTextDiv = findAllTextNodesWithEncryptedDiv(quoteOrReply);
    nakedBmailTextDiv.forEach(wrappedDiv => {
        replaceTextNodeWithDiv(wrappedDiv as HTMLElement);
    })

    if (!cryptoBtnDiv) {
        cryptoBtnDiv = addDecryptButtonForBmailBody(template, quoteOrReply, 'bmail_decrypt_btn_in_compose_outlook')
        if (cryptoBtnDiv) {
            toolBarDiv.insertBefore(cryptoBtnDiv, toolBarDiv.children[1]);
        }
        return;
    }

    const cryptoBtn = cryptoBtnDiv.querySelector(__decrypt_button_css_name) as HTMLElement;
    appendDecryptForDiv(cryptoBtnDiv, quoteOrReply);

    if (!quoteOrReply.textContent?.includes(MailFlag) || !cryptoBtn.dataset.encoded || cryptoBtn.dataset.encoded === 'true') {
        return;
    }

    let BMailDivs = EncryptedMailDivSearch(quoteOrReply) as HTMLElement[];
    BMailDivs.forEach(bmailBody => {
        decryptMailInReading(bmailBody, cryptoBtn).then();
    });
}

function addCryptBtnToMailHistory(mailContent: HTMLElement, template: HTMLTemplateElement) {
    const toolBarDiv = mailContent.firstChild as HTMLElement;

    const decryptBtn = toolBarDiv.querySelector(__decrypt_button_css_name) as HTMLElement;
    if (decryptBtn) {
        console.log("------>>> decrypt button already been added for reading");
        return;
    }

    const nakedBmailTextDiv = findAllTextNodesWithEncryptedDiv(mailContent);
    nakedBmailTextDiv.forEach(wrappedDiv => {
        replaceTextNodeWithDiv(wrappedDiv as HTMLElement);
    })

    let cryptoBtnDiv = addDecryptButtonForBmailBody(template, mailContent, 'bmail_decrypt_btn_in_compose_outlook');
    if (cryptoBtnDiv) {
        toolBarDiv.appendChild(cryptoBtnDiv);
    }
}

function prepareMailHistory(oneMail: HTMLElement, template: HTMLTemplateElement) {
    const mailBody = oneMail.querySelector('.uy30y') as HTMLElement;
    let mailContent = mailBody.querySelector(".mT25S") as HTMLElement;

    if (mailContent) {
        addCryptBtnToMailHistory(mailContent, template);
    }

    observeForElement(mailBody, 1000, () => {
        const newMailContent = mailBody.querySelector(".mT25S") as HTMLElement;
        if (mailContent === newMailContent) {
            return null;
        }
        mailContent = newMailContent;
        return newMailContent;
    }, async () => {
        addCryptBtnToMailHistory(mailContent, template);
    }, true)
}

class Provider implements ContentPageProvider {
    readCurrentMailAddress(): string {
        return queryEmailAddrOutLook() ?? "";
    }

    async processAttachmentDownload(fileName?: string, _attachmentData?: any): Promise<void> {
        await procDownloadFile(fileName);
    }
}

function prepareAttachmentForCompose(composeArea: HTMLElement, template: HTMLTemplateElement) {
    const overlayButton = template.content.getElementById('attachmentEncryptBtnOutlook') as HTMLButtonElement | null;
    if (!overlayButton) {
        console.log("----->>> overlayButton not found");
        return;
    }

    const nodeList = document.querySelectorAll('input[type="file"]');
    if (nodeList.length < 2) {
        console.log("------>>> no input file found for local attachment");
        return;
    }

    const fileInput = nodeList[1] as HTMLInputElement;

    const toolbar = document.getElementById("RibbonRoot") as HTMLElement;
    const attachmentDropdownBtn = toolbar.querySelector('button[data-ktp-target="ktp-m-a-f"]') as HTMLElement | null;
    if (!attachmentDropdownBtn) {
        const messageBtn = toolbar.querySelector('button[data-ktp-target="ktp-m"]')
        if (!messageBtn) {
            console.log("------>>> attachment button not found");
            return;
        }
        messageBtn.addEventListener('click', async () => {
            setTimeout(() => {
                prepareAttachmentForCompose(composeArea, template);
            }, 400);
        })
        return;
    }

    attachmentDropdownBtn.addEventListener('click', () => {
        setTimeout(() => {
            const floatDiv = document.getElementById("fluent-default-layer-host");
            const attachmentDiv = floatDiv?.querySelector("div.ms-FocusZone ul ul") as HTMLElement;
            if (!attachmentDiv || attachmentDiv.querySelector(".attachmentEncryptBtnOutlook")) {
                console.log("------>>> attachment div not found or duplicate element");
                return;
            }

            const aekIDSet = findAttachmentKeyID(composeArea);
            const overlyClone = overlayButton.cloneNode(true) as HTMLElement;
            overlyClone.querySelector(".button_txt_lbl")!.textContent = browser.i18n.getMessage('bmail_attachment_encrypt_btn');
            const aekID = addAttachmentEncryptBtn(fileInput, overlyClone, aekIDSet);
            attachmentDiv.insertBefore(overlyClone, attachmentDiv.firstChild);
            composeArea.dataset.attachmentKeyId = aekID;
        }, 600);
    });
}

function findAttachmentKeyID(composeArea: HTMLElement): Set<string> {
    const mySet = new Set<string>();
    const attachArea = composeArea.querySelector(".RrjjU.D_1qK.disableTextSelection") as HTMLElement
    const allAttachDivs = attachArea?.querySelectorAll("div.Y0d3P");
    if (!allAttachDivs || allAttachDivs.length === 0) {
        return mySet;
    }

    for (let i = 0; i < allAttachDivs.length; i++) {
        const element = allAttachDivs[i];
        const fileName = element.querySelector(".PQeLQ.QEiYT")?.textContent;
        const parsedId = extractAesKeyId(fileName);
        if (!parsedId) {
            continue;
        }
        mySet.add(parsedId.id);
    }

    return mySet;
}

function addDecryptBtnForAttachment(oneMail: HTMLElement, template: HTMLTemplateElement) {
    const attachmentListDiv = oneMail.querySelector(".RrjjU.disableTextSelection");
    const attachments = attachmentListDiv?.querySelectorAll(".Y0d3P");
    if (!attachments || !attachments.length) {
        console.log("------>>> no attachment found");
        return;
    }

    for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];
        const moreActionBtn = attachment.querySelector(".o4euS button");
        if (!moreActionBtn) {
            console.log("------>>> more action for attachment operation not found", attachment);
            continue;
        }
        const fileName = attachment.querySelector(".PQeLQ.QEiYT")?.textContent;
        const parsedId = extractAesKeyId(fileName);
        if (!parsedId) {
            return;
        }

        moreActionBtn.addEventListener('click', () => {
            setTimeout(() => {
                addBmailBtnToDropdownDiv(template, parsedId);
            }, 300);
        })
    }
}

function addBmailBtnToDropdownDiv(template: HTMLTemplateElement, aekId: AttachmentKeyID) {
    const contextMenuDiv = document.getElementById("fluent-default-layer-host")?.querySelector("ul.ms-ContextualMenu-list");
    if (!contextMenuDiv) {
        console.log("------>>> dropdown menu for download not found");
        return;
    }
    if (contextMenuDiv.childNodes.length !== 3) {
        console.log("------>>> failed to att css to download button");
        return;
    }

    const downloadBtn = contextMenuDiv.childNodes[2].firstChild as HTMLElement;

    const bmailDownloadLi = template.content.getElementById("attachmentDecryptOutlook") as HTMLElement;
    const clone = bmailDownloadLi.cloneNode(true) as HTMLElement;
    clone.querySelector(".ms-ContextualMenu-itemText.label-531")!.textContent = browser.i18n.getMessage('bmail_attachment_decrypt');
    clone.addEventListener('click', async () => {
        const aesKey = loadAKForReading(aekId.id);
        if (!aesKey) {
            const statusRsp = await sendMessageToBackground('', MsgType.CheckIfLogin)
            if (statusRsp.success < 0) {
                return;
            }

            showTipsDialog("Tips", browser.i18n.getMessage("decrypt_mail_body_first"))
            return;
        }
        downloadBtn.click();
    });

    contextMenuDiv.appendChild(clone);
}

function extractFileNameWithExtension(filePath: string): string | null {
    const lastSlashIndex = filePath.lastIndexOf('/');
    if (lastSlashIndex !== -1) {
        return filePath.slice(lastSlashIndex + 1);
    } else {
        return null;
    }
}

async function procDownloadFile(filePath?: string) {
    if (!filePath) {
        console.log("------>>> miss parameters:filePath");
        return;
    }
    const fileName = extractFileNameWithExtension(filePath);
    if (!fileName) {
        console.log("------>>>  filePath", filePath);
        return;
    }

    const aekId = extractAesKeyId(fileName);
    if (!aekId) {
        console.log("----->>> not bmail file:", fileName);
        return;
    }
    const dialog = document.getElementById("bmail-decrypt-dialog") as HTMLElement
    dialog.style.display = 'block';
    dialog.querySelector(".bmail-file-path")!.textContent = filePath;

    const fileInput = dialog.querySelector('input') as HTMLInputElement;
    fileInput.accept = "." + aekId.id + "_" + AttachmentFileSuffix;

    const inputFun = async (event: Event) => {
        await decryptDownloadedFile(event, aekId);
        dialog.style.display = 'none';
        fileInput.value = '';
        fileInput.accept = "";
        fileInput.removeEventListener('change', inputFun);
    }
    fileInput.addEventListener('change', inputFun);

    const clickFun = () => fileInput.click();
    const decryptBtn = dialog.querySelector(".bmail-decrypt-btn") as HTMLElement;
    if (decryptBtn.dataset.hasProcAction === "true") {
        return;
    }

    decryptBtn.dataset.hasProcAction = "true";
    decryptBtn.addEventListener('click', clickFun);
}

async function decryptDownloadedFile(event: Event, aekId: AttachmentKeyID): Promise<void> {
    const aesKey = loadAKForReading(aekId.id);
    if (!aesKey) {
        const statusRsp = await sendMessageToBackground('', MsgType.CheckIfLogin)
        if (statusRsp.success < 0) {
            return;
        }

        showTipsDialog("Tips", browser.i18n.getMessage("decrypt_mail_body_first"))
        return;
    }

    const tempInput = event.target as HTMLInputElement;
    const files = tempInput.files;
    if (!files || files.length === 0) {
        showTipsDialog("Tips", browser.i18n.getMessage("bmail_file_load_failed"));
        return;
    }

    const fileName = moveParenthesesBeforeExtension(aekId.originalFileName);
    decryptFile(files[0], aesKey, fileName).catch(err => {
        let e = err as Error;
        showTipsDialog("Error", e.message);
    });
}


function appendDecryptDialog(template: HTMLTemplateElement) {
    const dialog = template.content.getElementById("bmail-decrypt-dialog");
    if (!dialog) {
        console.log("------>>>failed to find decrypt dialog");
        return;
    }

    const clone = dialog.cloneNode(true) as HTMLElement;
    clone.style.display = 'none';
    clone.querySelector(".bmail-download-tips")!.textContent = browser.i18n.getMessage('bmail_download_tips');
    clone.querySelector(".bmail-filepath-tips")!.textContent = browser.i18n.getMessage('bmail_filepath_tips');
    const decryptBtn = clone.querySelector(".bmail-decrypt-btn") as HTMLElement;
    const cancelBtn = clone.querySelector(".bmail-cancel-btn") as HTMLElement;

    decryptBtn.innerText = browser.i18n.getMessage('decrypt_mail_body');
    cancelBtn.innerText = browser.i18n.getMessage('Cancel');
    cancelBtn.addEventListener('click', () => {
        clone.style.display = 'none';
    })

    document.body.appendChild(clone);
}

(window as any).contentPageProvider = new Provider();
setKeepAlive();
document.addEventListener('DOMContentLoaded', async () => {
    addCustomStyles('css/outlook.css');
    const template = await parseContentHtml('html/inject_outlook.html');
    appendDecryptDialog(template);
    appendForOutLook(template);
    console.log("------>>> outlook content init success");
});