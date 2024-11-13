import {
    __decrypt_button_css_name, addCustomStyles,
    addDecryptButtonForBmailBody,
    checkFrameBody,
    encryptMailInComposing, extractAesKeyId, ContentPageProvider,
    observeForElement,
    parseBmailInboxBtn, parseContentHtml,
    parseCryptoMailBtn, processInitialTextNodesForGoogle, processReceivers, showTipsDialog, setKeepAlive
} from "./content_common";
import {emailRegex, hideLoading, showLoading} from "./utils";
import browser from "webextension-polyfill";
import {addAttachmentEncryptBtn, decryptAttachment} from "./content_attachment";

function appendForGoogle(template: HTMLTemplateElement) {
    const clone = parseBmailInboxBtn(template, 'bmail_left_menu_btn_google') as HTMLElement;

    // console.log("------>>> start to append element to google mail");
    const viewAllMailDiv = document.querySelector(".bodycontainer");
    if (viewAllMailDiv) {
        console.log("------>>> this is view all mail content");
        addDecryptBtnToSimpleMailAllDiv(template, viewAllMailDiv as HTMLElement);
        return;
    }
    monitorComposeActionGoogle(template).then();

    observeForElement(document.body, 1000,
        () => {
            return document.querySelector('.TK') as HTMLElement;
        }, async () => {
            console.log("------>>>start to monitor google area");
            monitorReadingActionGoogle(template).then();
            addBMailInboxToMenu(clone).then();
        });
}

async function addBMailInboxToMenu(clone: HTMLElement) {
    const composBtn = document.querySelector(".T-I.T-I-KE.L3");
    if (!composBtn) {
        console.warn("------>>> compose button not found");
        return;
    }
    composBtn.parentNode!.appendChild(clone);
    // console.log("------>>> add bmail inbox button success=>")
}

function queryEmailAddrGoogle() {
    const pageTitle = document.title;
    const match = pageTitle.match(emailRegex);
    if (match) {
        const email = match[1];
        console.log('----->>> google email found:', email);
        return email;
    }
    console.log('------>>>No email address found in the page title.');
    return null
}


const _composeBtnParentClass = "td.I5"
const __bmailComposeDivId = "bmail-mail-body-for-gmail";


async function prepareMailContent(composeDiv: HTMLElement): Promise<HTMLElement> {
    let mailBodyDiv = composeDiv.querySelector('.Am.aiL.Al.editable') as HTMLElement;
    if (!mailBodyDiv) {
        return composeDiv;
    }
    const gmailBody = mailBodyDiv.querySelector('.' + __bmailComposeDivId) as HTMLElement;
    if (gmailBody) {
        return gmailBody;
    }

    const div = document.createElement("div");
    div.classList.add(__bmailComposeDivId);
    const replayArea = mailBodyDiv.querySelector(".gmail_quote");

    const childrenArray = Array.from(mailBodyDiv.childNodes);
    childrenArray.forEach((subNode) => {
        if (replayArea && subNode === replayArea) {
            return;
        }
        div.appendChild(subNode);
    });

    mailBodyDiv.insertBefore(div, mailBodyDiv.firstChild);
    return div;
}

function _addCryptoBtnForComposeDiv(template: HTMLTemplateElement, composeDiv: HTMLElement) {

    const node = composeDiv.querySelector(".bmail-crypto-btn") as HTMLElement;
    if (node) {
        console.log("------>>> node already exists");
        return;
    }

    const titleForm = composeDiv.querySelector("form") as HTMLElement;
    const title = browser.i18n.getMessage('crypto_and_send');

    const toolBarTr = composeDiv.querySelector("tr.btC") as HTMLElement;
    const sendDiv = toolBarTr.querySelector(".dC")?.firstChild as HTMLElement;

    _prepareAttachmentForCompose(template, toolBarTr, composeDiv);

    const clone = parseCryptoMailBtn(template, 'file/logo_48.png', ".bmail-crypto-btn", title,
        "bmail_crypto_btn_in_compose_google", async _ => {
            const aekId = composeDiv.dataset.attachmentKeyId ?? "";
            const mailBodyDiv = await prepareMailContent(composeDiv);
            await encryptMailAndSendGoogle(mailBodyDiv, titleForm, sendDiv, aekId);
        });
    if (!clone) {
        console.log("------>>> crypt button not found");
        return;
    }

    const newTd = document.createElement('td');
    newTd.append(clone);

    const secondTd = toolBarTr.querySelector('td:nth-child(2)');
    if (secondTd) {
        toolBarTr.insertBefore(newTd, secondTd);
    }
}

function findAttachmentKeyID(composeDiv: HTMLElement): Set<string> {
    const mySet = new Set<string>();
    const attachFileArea = composeDiv.querySelector(".bA3 .GM")?.querySelectorAll(".dL");
    if (!attachFileArea || attachFileArea.length === 0) {
        console.log("------>>> no attached filed found");
        return mySet;
    }

    for (let i = 0; i < attachFileArea.length; i++) {
        const element = attachFileArea.item(i);
        const fileName = element.querySelector(".vI")?.textContent;
        const parsedId = extractAesKeyId(fileName);
        if (!parsedId) {
            continue;
        }
        mySet.add(parsedId.id)
        break;
    }
    return mySet;
}

function _prepareAttachmentForCompose(template: HTMLTemplateElement, toolBarTr: HTMLElement, composeDiv: HTMLElement) {
    const overlayButton = template.content.getElementById('attachmentEncryptBtnGmail') as HTMLButtonElement | null;
    if (!overlayButton) {
        console.log("----->>> overlayButton not found");
        return;
    }

    const attachmentDiv = toolBarTr.querySelector(".a8X.gU .bAK") as HTMLElement;
    const fileInput = attachmentDiv.querySelector('input[name="Filedata"]') as HTMLInputElement;
    if (!fileInput || !attachmentDiv) {
        console.log("----->>> file input not found", fileInput, attachmentDiv);
        return;
    }

    if (attachmentDiv.querySelector(".attachmentEncryptBtnGmail")) {
        console.log("----->>> overly button already added before for mail composing");
        return;
    }

    const aekIdSet = findAttachmentKeyID(composeDiv);
    const overlyClone = overlayButton.cloneNode(true) as HTMLElement;
    const aekID = addAttachmentEncryptBtn(fileInput, overlyClone, aekIdSet);
    attachmentDiv.insertBefore(overlyClone, attachmentDiv.firstChild);
    composeDiv.dataset.attachmentKeyId = aekID;
}


async function addCryptoBtnToComposeDivGoogle(template: HTMLTemplateElement) {
    const allComposeDiv = document.querySelectorAll(_composeBtnParentClass);
    console.log("------>>> all compose div when loaded=>", allComposeDiv.length);
    allComposeDiv.forEach(composeDiv => {
        _addCryptoBtnForComposeDiv(template, composeDiv as HTMLElement);
    });
}

async function encryptMailAndSendGoogle(mailBody: HTMLElement, titleForm: HTMLElement, sendDiv: HTMLElement, aekId?: string) {
    showLoading();
    try {
        const divsWithDataHoverCardId = titleForm.querySelectorAll('div[data-hovercard-id]') as NodeListOf<HTMLElement>;
        const receiver = await processReceivers(divsWithDataHoverCardId, (div) => {
            return div.getAttribute('data-hovercard-id') as string | null;
        });

        const success = await encryptMailInComposing(mailBody, receiver, aekId);
        if (!success) {
            return;
        }
        sendDiv.click();
        console.log("------>>> send success");
    } catch (e) {
        console.log("------>>> decode or encode error:", e);
        showTipsDialog("error", "encrypt mail content failed");
    } finally {
        hideLoading();
    }
}

async function monitorReadingActionGoogle(template: HTMLTemplateElement) {
    const mainArea = document.querySelector(".nH.bkK") as HTMLElement;
    let oldDivNo = 0;
    observeForElement(mainArea, 1000, () => {
        const div = mainArea.querySelectorAll(".a3s.aiL");
        if (div.length === oldDivNo) {
            console.log("-------->>>null-------------------------------->>>", div, oldDivNo)
            return null;
        }
        oldDivNo = div.length;
        console.log("-------->>>div-------------------------------->>>", div)
        return div[0] as HTMLElement;
    }, async () => {
        addCryptoBtnToReadingMailGoogle(template, mainArea).then();
    }, true);
}

async function addCryptoBtnToReadingMailGoogle(template: HTMLTemplateElement, mainArea?: HTMLElement) {
    let parentDiv = document.body;
    if (mainArea) {
        parentDiv = mainArea;
    }

    const mailBodyList = parentDiv.querySelectorAll(".adn.ads") as NodeListOf<HTMLElement>;
    console.log("------>>> all reading div found:", mailBodyList.length);
    mailBodyList.forEach((oneMail) => {
        const mailParentDiv = oneMail.querySelector(".ii.gt") as HTMLElement | null;
        if (!mailParentDiv) {
            console.log("------>>> no mail content parent div found");
            return;
        }
        const bmailBtn = oneMail.querySelector(__decrypt_button_css_name) as HTMLElement;
        if (bmailBtn) {
            console.log("------>>> duplicate bmail button found for mail reading......")
            checkFrameBody(mailParentDiv, bmailBtn);
            return;
        }
        const mailBody = mailParentDiv.firstChild as HTMLElement;
        // console.log("------>>> mailBody.firstChild  ", mailBody.children, mailBody.firstChild?.nodeType, mailBody.textContent)
        processInitialTextNodesForGoogle(mailBody);

        const quotedDivs = mailBody.querySelectorAll("blockquote") as NodeListOf<HTMLElement>;
        quotedDivs.forEach(quotedDiv => {
            processInitialTextNodesForGoogle(quotedDiv);
        })

        const cryptoBtnDiv = addDecryptButtonForBmailBody(template, oneMail, 'bmail_decrypt_btn_in_compose_google');
        if (!cryptoBtnDiv) {
            return;
        }

        mailParentDiv.insertBefore(cryptoBtnDiv, mailParentDiv.firstChild);
        setTimeout(() => {
            addDecryptBtnForAttachment(oneMail, template);
        }, 2000);
    })
}

function parseBmailDecryptButton(template: HTMLTemplateElement, idx: number, url: string, parsedId: {
    id: string;
    originalFileName: string
}): HTMLElement {
    const cryptoBtnDiv = template.content.getElementById("attachmentDecryptGoogle") as HTMLElement;
    const clone = cryptoBtnDiv.cloneNode(true) as HTMLElement;
    clone.setAttribute('id', "");
    clone.querySelector(".attachmentDecryptGoogle_tips")!.textContent = browser.i18n.getMessage("bmail_attachment_decrypt");
    clone.addEventListener('click', async () => {
        await decryptAttachment(parsedId.id, url, parsedId.originalFileName);
    });

    const id = "attachmentDecryptGoogle_tips_" + idx;
    clone.querySelector(".attachmentDecryptGoogle_tips")!.setAttribute('id', id);
    clone.querySelector("button")!.setAttribute('data-tooltip-id', id);

    return clone;
}

function addDecryptBtnForAttachment(oneMail: HTMLElement, template: HTMLTemplateElement) {
    const attachmentArea = oneMail.querySelector(".hq.gt")?.querySelector(".aQH")
    if (!attachmentArea) {
        console.log("------>>> no attachment list");
        return;
    }

    const attachmentDiv = attachmentArea.querySelectorAll("span.aZo.N5jrZb");
    if (!attachmentDiv || !attachmentDiv.length) {
        console.log("------>>>no attachment item found");
        return;
    }

    for (let i = 0; i < attachmentDiv.length; i++) {
        const attachmentItem = attachmentDiv[i] as HTMLElement;

        const urlLinkDiv = attachmentItem.querySelector("a.aQy.e") as HTMLLinkElement;
        const attachmentTool = attachmentItem.querySelector(".aQw");
        const fileName = attachmentItem.querySelector("span.aV3")?.textContent

        if (!attachmentTool || attachmentTool.childNodes.length < 2 || !fileName || !urlLinkDiv.href) {
            console.log("------>>> failed find the attachment tool or file name or url", attachmentTool, fileName, urlLinkDiv.href);
            continue;
        }
        const parsedId = extractAesKeyId(fileName);
        if (!parsedId) {
            console.log("------>>> no need to add decrypt button to this attachment element");
            continue;
        }

        const clone = parseBmailDecryptButton(template, i, urlLinkDiv.href, parsedId);
        attachmentTool.insertBefore(clone, attachmentTool.firstChild);
    }
}

async function monitorComposeActionGoogle(template: HTMLTemplateElement) {
    let composeDivArray: HTMLElement[] = [];
    observeForElement(document.body, 1000, () => {//
        const newComposeArr = Array.from(document.querySelectorAll('div[data-compose-id]') as NodeListOf<HTMLElement>);
        if (newComposeArr.length > composeDivArray.length) {
            composeDivArray = newComposeArr;
            return newComposeArr[0] as HTMLElement;
        }
        composeDivArray = newComposeArr;
        return null;
    }, async () => {
        const composeDialogs = document.querySelectorAll('div[data-compose-id]') as NodeListOf<HTMLElement>;
        if (composeDialogs.length <= 0) {
            console.log("------>>> no dialog compose:");
            return;
        }
        await addCryptoBtnToComposeDivGoogle(template);
    }, true);
}


function addDecryptBtnToSimpleMailAllDiv(template: HTMLTemplateElement, viewAllMailDiv: HTMLElement) {
    const mainContent = viewAllMailDiv.querySelector(".maincontent") as HTMLElement;
    const bmailBtn = mainContent.querySelector(__decrypt_button_css_name) as HTMLElement;
    if (bmailBtn) {
        console.log("------>>> duplicate bmail button found for mail reading......")
        checkFrameBody(viewAllMailDiv, bmailBtn);
        return;
    }

    const cryptoBtnDiv = addDecryptButtonForBmailBody(template, mainContent, 'bmail_decrypt_btn_in_compose_google');
    if (!cryptoBtnDiv) {
        return;
    }

    mainContent.insertBefore(cryptoBtnDiv, mainContent.firstChild);
}

class Provider implements ContentPageProvider {
    readCurrentMailAddress(): string {
        return queryEmailAddrGoogle() ?? "";
    }

    async processAttachmentDownload(_fileName?: string, _attachmentData?: any): Promise<void> {
        return;
    }
}

(window as any).contentPageProvider = new Provider();
setKeepAlive();

document.addEventListener('DOMContentLoaded', async () => {
    addCustomStyles('css/google.css');
    const template = await parseContentHtml('html/inject_google.html');
    appendForGoogle(template);
    console.log("------>>> google content init success");
});
