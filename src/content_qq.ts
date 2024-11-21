import {
    __decrypt_button_css_name,
    __localContactMap,
    addCustomStyles,
    addDecryptButtonForBmailBody,
    addLoginCheckForEditAgainBtn,
    checkFrameBody,
    ContentPageProvider,
    decryptMailForEditionOfSentMail,
    decryptMailInReading,
    encryptMailInComposing,
    extractAesKeyId,
    findAllTextNodesWithEncryptedDiv,
    observeForElement,
    observeForElementDirect,
    observeFrame,
    parseBmailInboxBtn,
    parseContentHtml,
    parseCryptoMailBtn,
    processReceivers,
    queryContactFromSrv,
    replaceTextNodeWithDiv,
    setKeepAlive,
    showTipsDialog
} from "./content_common";
import {emailRegex, extractEmail, hideLoading, sendMessageToBackground, showLoading,} from "./utils";
import browser from "webextension-polyfill";
import {__bmail_mail_body_class_name, MsgType} from "./consts";
import {addAttachmentEncryptBtn, decryptAttachmentFileData, loadAKForReading} from "./content_attachment";
import {MailFlag} from "./bmail_body";

function appendForQQ(template: HTMLTemplateElement) {

    observeForElement(document.body, 1000,
        () => {
            return document.querySelector(".ui-float-scroll-body.sidebar-menus") as HTMLElement || document.getElementById("SysFolderList") as HTMLElement;
        }, async () => {
            appendBmailInboxMenuQQ(template).then();

            monitorQQMailReading(template).then();
            monitorQQMailReadingOldVersion(template).then();

            monitorComposeAction(template).then();
            monitorComposeActionOldVersion(template).then();
        });
}

async function appendBmailInboxMenuQQ(template: HTMLTemplateElement) {
    const menuParentDiv1 = document.querySelector(".ui-float-scroll-body.sidebar-menus");
    const menuParentDiv2 = document.querySelector("#SysFolderList ul") as HTMLElement;
    const menuParentDiv = menuParentDiv1 || menuParentDiv2;
    if (!menuParentDiv) {
        console.log("------>>> menu parent div not found");
        return;
    }
    let clone = parseBmailInboxBtn(template, "bmail_left_menu_btn_qq") as HTMLElement;
    if (!menuParentDiv1) {
        clone = parseBmailInboxBtn(template, "bmail_left_menu_btn_qq_old") as HTMLElement;
    }

    if (menuParentDiv.children.length >= 2) {
        menuParentDiv.insertBefore(clone, menuParentDiv.children[1]);
    } else {
        menuParentDiv.appendChild(clone);
    }
}

function queryEmailAddrQQ() {
    const parentDiv = document.querySelector(".profile-user-info");
    const userEmailSpan1 = parentDiv?.querySelector('span.user-email');
    const userEmailSpan2 = document.getElementById("useraddr");
    const userEmailSpan = userEmailSpan1 || userEmailSpan2;
    if (!userEmailSpan) {
        console.log("-------->>> failed to parse bmail inbox button");
        return null;
    }

    const mailAddress = userEmailSpan.textContent as string;
    const match = mailAddress.match(emailRegex);
    if (!match) {
        console.log("------>>> failed to parse bmail address");
        return null;
    }
    console.log("------>>> qq mail address success:", match[0]);
    return match[0];
}


async function addCryptoBtnToComposeDivQQ(template: HTMLTemplateElement, composeDiv: HTMLElement) {
    const toolBar = composeDiv.querySelector(".mail-compose-header .ui-ellipsis-toolbar-btns");
    if (!toolBar) {
        console.log("----->>> tool bar not found in compose");
        return;
    }

    const cryptoBtn = toolBar.querySelector(".bmail-crypto-btn") as HTMLElement;
    if (cryptoBtn) {
        console.log("----->>> crypto button already exists");
        return;
    }
    const sendDiv = toolBar.querySelector(".ui-btn-them-blue-lighten") as HTMLElement;
    if (!sendDiv) {
        console.log("----->>> send button not found in compose");
        return
    }

    const mailBodyDiv = composeDiv.querySelector(".mail-content-editor") as HTMLElement;
    if (!mailBodyDiv) {
        console.log("----->>> mail body not found in compose");
        return;
    }

    await checkIfEditAgainContent(mailBodyDiv);

    const aekID = prepareAttachmentForCompose(template, composeDiv);
    const title = browser.i18n.getMessage('crypto_and_send');
    const receiverTable = composeDiv.querySelector('.mail-compose-receivers') as HTMLElement;
    if (!receiverTable) {
        console.log("----->>> receiver table not found in compose");
        return;
    }

    const cryptoBtnDiv = parseCryptoMailBtn(template, 'file/logo_48.png', ".bmail-crypto-btn",
        title, 'bmail_crypto_btn_in_compose_qq', async _ => {
            const mailContentDiv = await prepareMailContent(mailBodyDiv);
            await prepareContact(receiverTable);
            mailContentDiv.dataset.attachmentKeyId = aekID;
            await encryptMailAndSendQQ(mailContentDiv, receiverTable, sendDiv);
        }
    ) as HTMLElement;
    toolBar.insertBefore(cryptoBtnDiv, sendDiv.nextSibling as HTMLElement);
}

function prepareAttachmentForCompose(template: HTMLTemplateElement, composeDiv: HTMLElement): string {

    const overlayButton = template.content.getElementById('attachmentOverlayBtnQQ') as HTMLButtonElement | null;
    if (!overlayButton) {
        console.log("----->>> overlayButton not found");
        return "";
    }
    const attachAreaDiv = composeDiv.querySelector(".mail-compose-attaches") as HTMLElement;
    if (!attachAreaDiv) {
        console.log("----->>> attach area not found in compose");
        return "";
    }

    const fileInput = attachAreaDiv.querySelector("input.attach-file-input") as HTMLInputElement;
    const attachmentDiv = composeDiv.querySelector(".mail-compose-content-toolbar .ui-ellipsis-toolbar-btns") as HTMLElement;
    if (!fileInput || !attachmentDiv) {
        console.log("----->>> file input or tool bar not found");
        return "";
    }
    if (attachmentDiv.querySelector(".attachmentOverlayBtnQQ")) {
        console.log("----->>> overly button already added before for mail composing");
        return "";
    }

    const aekIDSet = findAttachmentKeyID(composeDiv);
    const overlyClone = overlayButton.cloneNode(true) as HTMLElement;
    overlyClone.textContent = browser.i18n.getMessage('bmail_attachment_encrypt_btn');
    const aekId = addAttachmentEncryptBtn(fileInput, overlyClone, aekIDSet);
    attachmentDiv.appendChild(overlyClone);

    return aekId;
}


function findAttachmentKeyID(composeDiv: HTMLElement): Set<string> {
    const mySet = new Set<string>();

    const allAttachDivs = composeDiv.querySelector(".mail-compose-attach-cards")?.querySelectorAll(".attach-card.attach-card-success");
    if (!allAttachDivs || allAttachDivs.length === 0) {
        return mySet;
    }

    for (let i = 0; i < allAttachDivs.length; i++) {
        const element = allAttachDivs[i];
        const fileName = element.querySelector(".attach-name")?.textContent;
        const fileSuffix = element.querySelector(".attach-suffix")?.textContent;
        if (!fileSuffix || !fileName) {
            continue;
        }

        const parsedId = extractAesKeyId(fileName + fileSuffix);
        if (!parsedId) {
            continue;
        }
        mySet.add(parsedId.id);
    }

    return mySet;
}

async function checkIfEditAgainContent(mailBody: HTMLElement) {
    const editAgainContentDiv = mailBody.firstElementChild as HTMLElement;
    if (!mailBody.innerText.includes(MailFlag)) {
        return;
    }
    await decryptMailForEditionOfSentMail(editAgainContentDiv, true);
}

async function prepareMailContent(mailContentDiv: HTMLElement): Promise<HTMLElement> {

    let newMailBody = mailContentDiv.firstElementChild as HTMLElement;
    if (newMailBody.classList.contains(__bmailComposeDivId)) {
        return newMailBody;
    }

    newMailBody = document.createElement("div");
    newMailBody.classList.add(__bmailComposeDivId);

    const replyOrQuoteDiv = mailContentDiv.querySelector("article");
    Array.from(mailContentDiv.children).forEach((child) => {
        if (child !== replyOrQuoteDiv) {
            newMailBody.appendChild(child); // 将子节点移入 newMailBody
        }
    });

    mailContentDiv.insertBefore(newMailBody, mailContentDiv.firstChild);

    return newMailBody;
}

async function encryptMailAndSendQQ(mailBody: HTMLElement, receiverTable: HTMLElement, sendDiv: HTMLElement) {
    showLoading();
    try {
        const statusRsp = await sendMessageToBackground('', MsgType.CheckIfLogin)
        if (statusRsp.success < 0) {
            return;
        }

        let bodyTextContent = mailBody.innerText.trim();
        if (bodyTextContent.length <= 0) {
            showTipsDialog("Tips", browser.i18n.getMessage("encrypt_mail_body"));
            return;
        }

        const allEmailAddressDiv = receiverTable.querySelectorAll("div[data-email]") as NodeListOf<HTMLElement>;
        const receiver = await processReceivers(allEmailAddressDiv, (div) => {
            // console.log("------>>> nick email:", email);
            return div.dataset.email ?? "";
        });
        if (!receiver || receiver.length <= 0) {
            return;
        }

        const aekId = mailBody.dataset.attachmentKeyId ?? "";
        const success = await encryptMailInComposing(mailBody, receiver, aekId);
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

function monitorReadingArea(template: HTMLTemplateElement, mainArea: HTMLElement) {
    let oldElement: HTMLElement | null;
    observeForElement(mainArea, 200, () => {
        const readerElm = mainArea.querySelector(".mail-list-page-reader-body.reader-body-children") as HTMLElement;
        if (oldElement === readerElm) {
            return null;
        }
        oldElement = readerElm;
        return readerElm;
    }, async () => {
        // const readerElm = mainArea.querySelector(".mail-list-page-reader-body.reader-body-children");
        // console.log("------>>> reader element:", readerElm);
        addCryptoBtnToReadingMailQQ(template, mainArea);
    }, true);
}

async function monitorQQMailReading(template: HTMLTemplateElement) {
    const mainArea = document.querySelector(".frame-main") as HTMLElement | null;
    if (!mainArea) {
        console.log("------>>> no mail reading area found");
        return;
    }

    // monitorMsgTip(template, mainArea);
    monitorReadingArea(template, mainArea);
    //
    // mainArea.addEventListener("click", (event) => {
    //     const targetElement = event.target as HTMLElement;
    //     const mailItemDiv = targetElement.closest('div.mail-list-page-item') as HTMLElement | null;
    //     const nextOrPreviousMailBtn = targetElement.closest(".mail-list-page-toolbar.toolbar-only-reader")
    //     if (!mailItemDiv && !nextOrPreviousMailBtn) {
    //         // console.log("------>>> this is not a mail reading action");
    //         return;
    //     }
    //
    //     let idleTimer = setTimeout(() => {
    //         console.log("------>>> target hint, check elements and add bmail buttons");
    //         clearTimeout(idleTimer);
    //
    //         addCryptoBtnToReadingMailQQ(template, mainArea);
    //     }, 1200);
    // });
}

function addCryptoBtnToReadingMailQQ(template: HTMLTemplateElement, mainArea?: HTMLElement) {
    // console.log("------>>> try to add button to mail reading div");
    let parentDiv = document.body;
    if (mainArea) {
        parentDiv = mainArea;
    }
    const toolBar = parentDiv.querySelector(".basic-body-item .mail-detail-basic-action-bar") as HTMLElement | null;
    if (!toolBar) {
        console.log("------>>> tool bar for crypt button not found");
        return;
    }

    const decryptBtn = toolBar.querySelector(__decrypt_button_css_name) as HTMLElement;
    if (decryptBtn) {
        console.log("------>>> decrypt button already been added for reading");
        return;
    }

    const mailArea = parentDiv.querySelector(".xmail-ui-float-scroll .mail-detail-content") as HTMLElement | null;
    if (!mailArea) {
        console.log("------>>> no reading mail body found");
        return;
    }

    const nakedBmailTextDiv = findAllTextNodesWithEncryptedDiv(mailArea);
    nakedBmailTextDiv.forEach(wrappedDiv => {
        replaceTextNodeWithDiv(wrappedDiv as HTMLElement);
    })

    const cryptoBtnDiv = addDecryptButtonForBmailBody(template, mailArea, 'bmail_decrypt_btn_in_compose_qq');
    if (!cryptoBtnDiv) {
        return;
    }

    toolBar.insertBefore(cryptoBtnDiv, toolBar.firstChild);

    const topToolBarDiv = parentDiv.querySelector(".ui-ellipsis-toolbar-btns");
    const editAgainBtnSvg = topToolBarDiv?.querySelector('svg path[d^="M5.25 4.25"]') as HTMLElement | null;
    if (editAgainBtnSvg) {
        addLoginCheckForEditAgainBtn(topToolBarDiv!.firstElementChild as HTMLElement);
    }

    const replayBar = parentDiv.querySelector(".mail-detail-reply") as HTMLElement | null;
    if (replayBar) {
        observeForElementDirect(replayBar, 1000, () => {
            return replayBar.querySelector(".mail-replay-editor-wrap")
        }, async () => {
            const contentOfReply = replayBar.querySelector(".mail-replay-editor-wrap") as HTMLElement;
            addCryptoBtnToQuickReply(template, contentOfReply);
        });
    }

    addDecryptBtnForAttachment(template);
}

function addDecryptBtnForAttachment(template: HTMLTemplateElement) {

    const attachmentDiv = document.querySelectorAll(".frame-main .mail-detail-attaches .mail-detail-attaches-card");
    if (!attachmentDiv || attachmentDiv.length === 0) {
        console.log("------>>>", "no attachment found");
        return;
    }
    const bmailDownloadLi = template.content.getElementById("attachmentDecryptLink") as HTMLElement;

    for (let i = 0; i < attachmentDiv.length; i++) {
        const attachment = attachmentDiv[i] as HTMLElement;
        if (attachment.querySelector(".attachmentDecryptLink")) {
            continue;
        }

        const fileNamePrefix = attachment.querySelector(".attach-name")?.textContent;
        const fileNameSuffix = attachment.querySelector(".attach-suffix")?.textContent;
        if (!fileNameSuffix || !fileNameSuffix) {
            console.log("------>>> no attachment file name found");
            continue;
        }

        const parsedId = extractAesKeyId(fileNamePrefix + fileNameSuffix);
        if (!parsedId) {
            console.log("------>>> no need to add decrypt button to this attachment element");
            continue;
        }
        const toolbar = attachment.querySelector(".xmail-ui-hyperlink.attach-link")?.parentNode
        if (!toolbar || toolbar.childNodes.length < 2) {
            console.log("------>>> download tool bar not found");
            continue;
        }
        const clone = bmailDownloadLi.cloneNode(true) as HTMLElement;
        clone.textContent = browser.i18n.getMessage('bmail_attachment_decrypt');
        const downBtn = toolbar.childNodes[1] as HTMLElement;
        addDecryptBtnToAttachmentItem(downBtn, clone, parsedId.id);
        toolbar.append(clone);
    }
}

function addDecryptBtnToAttachmentItem(downloadBtn: HTMLElement, clone: HTMLElement, aekID: string) {
    clone.addEventListener('click', async () => {
        const aesKey = loadAKForReading(aekID);
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
}

function addCryptoBtnToQuickReply(template: HTMLTemplateElement, replyContentDiv: HTMLElement) {
    const toolbar = replyContentDiv.querySelector(".reply-footer");
    if (!toolbar) {
        console.log("----->>>no tool bar found in  quick reply ==> qq new version ")
        return;
    }
    const cryptBtn = toolbar.querySelector(".bmail-crypto-btn")
    if (cryptBtn) {
        console.log("----->>> crypt button already added for quick reply ===> qq new version")
        return;
    }
    const sendDiv = toolbar.children[0] as HTMLElement | null;
    if (!sendDiv) {
        console.log("----->>> send button not found in quick reply ==> qq new version ");
        return;
    }

    const mailNickNameDiv = replyContentDiv.querySelector('.cmp-account-wrap') as HTMLElement;
    if (!mailNickNameDiv) {
        console.log("----->>> email address not found in quick reply ==> qq new version ");
        return;
    }

    const mailContentDiv = replyContentDiv.querySelector(".reply-editor") as HTMLElement;
    if (!mailContentDiv) {
        console.log("------>>> mail body not found in quick reply ==> qq new version ");
        return;
    }

    const title = browser.i18n.getMessage('crypto_and_send');
    const cryptoBtnDiv = parseCryptoMailBtn(template, 'file/logo_48.png', ".bmail-crypto-btn",
        title, 'bmail_crypto_btn_in_compose_qq_simple', async _ => {

            const work = new Promise<string>((resolve) => {
                resolveContactDetailStack.push(resolve); // 将 resolve 函数压入栈顶
            });
            addMouseEnter(mailNickNameDiv);
            const email = await work;
            addMouseLeaveAction(mailNickNameDiv);

            await encryptSimpleMailReplyQQ(mailContentDiv, email, sendDiv);
        }
    ) as HTMLElement;

    toolbar.insertBefore(cryptoBtnDiv, toolbar.children[1]);
}

async function encryptSimpleMailReplyQQ(mailBody: HTMLElement, email: string, sendDiv: HTMLElement) {
    showLoading();
    try {
        const statusRsp = await sendMessageToBackground('', MsgType.CheckIfLogin)
        if (statusRsp.success < 0) {
            return;
        }
        let bodyTextContent = mailBody.innerText.trim();

        if (bodyTextContent.length <= 0) {
            showTipsDialog("Tips", browser.i18n.getMessage("encrypt_mail_body"));
            return;
        }

        let address = __localContactMap.get(email);
        if (!address) {
            const receiver = await queryContactFromSrv([email], []);
            if (!receiver || receiver.length <= 0) {
                showTipsDialog("Warning", "no blockchain address found for email:" + email);
                return;
            }
            address = receiver[0];
        }
        const success = await encryptMailInComposing(mailBody, [address]);
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

function addMouseEnter(targetDiv: HTMLElement) {
    const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        view: window
    });
    targetDiv.dispatchEvent(mouseEnterEvent);

    setTimeout(() => {
        const rect = targetDiv.getBoundingClientRect();
        const mouseMoveEvent = new MouseEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            view: window
        });
        targetDiv.dispatchEvent(mouseMoveEvent);
    }, 100);
}

function addMouseLeaveAction(contact: HTMLElement) {
    const mouseLeaveEvent = new MouseEvent('mouseleave', {
        bubbles: true,
        cancelable: true,
        view: window
    });
    contact.dispatchEvent(mouseLeaveEvent);
}

async function prepareContact(receiverTable: HTMLElement): Promise<void> {
    const contactListDiv = receiverTable.querySelectorAll(".cmp-account-wrap");

    const visibleNickElementsArray = Array.from(contactListDiv).filter((nickElement) => {
        return !nickElement.closest('.cmp-hide-accounts');
    });

    for (let i = 0; i < visibleNickElementsArray.length; i++) {
        const contact = visibleNickElementsArray[i] as HTMLElement;
        const work = new Promise<string>((resolve) => {
            resolveContactDetailStack.push(resolve); // 将 resolve 函数压入栈顶
        });
        addMouseEnter(contact);
        // console.log("-------->>>Received contact detail:", contactDetail);
        contact.dataset.email = await work;
        addMouseLeaveAction(contact);
    }
}

const resolveContactDetailStack: Array<(value: string) => void> = [];

function monitorQQContact() {
    observeForElementDirect(document.body, 0, () => {
        return document.querySelector(".xmail-cmp-contact-card")
    }, async () => {

        const contactDetail = document.querySelector(".xmail-cmp-contact-card");
        let email = ""
        const emailDiv = contactDetail?.querySelector(".cmp-card-email span") as HTMLElement
        if (emailDiv) {
            console.log("------>>>current email:=>", emailDiv.innerText);
            email = emailDiv.innerText.trim();
        }

        const resolve = resolveContactDetailStack.pop();
        if (resolve) {
            resolve(email);
        }

    }, true);
}


async function monitorComposeAction(template: HTMLTemplateElement) {
    let frameMainDiv = document.querySelector(".frame-main") as HTMLElement;
    if (!frameMainDiv) {
        console.log("------>>>compose action: this is not for qq new version");
        return;
    }

    monitorQQContact();

    let oldComposeDiv: HTMLElement | null = null;
    observeForElement(frameMainDiv, 800, () => {

        const newComposeDiv = frameMainDiv.querySelector(".mail-compose-page") as HTMLElement | null;
        if (oldComposeDiv === newComposeDiv) {
            return null;
        }
        oldComposeDiv = newComposeDiv;
        return newComposeDiv;
    }, async () => {
        const newComposeDiv = frameMainDiv.querySelector(".mail-compose-page") as HTMLElement
        addCryptoBtnToComposeDivQQ(template, newComposeDiv).then()
    }, true);
}


async function monitorComposeActionOldVersion(template: HTMLTemplateElement) {
    const monitorDiv = document.getElementById("resize") as HTMLElement;
    if (!monitorDiv) {
        console.log("------>>> this is not for qq old version");
        return;
    }

    let oldElement: HTMLElement | null = null;
    observeForElement(monitorDiv, 300, () => {
        const iframe = document.getElementById("mainFrameContainer")?.querySelector('iframe[name="mainFrame"]') as HTMLIFrameElement | null;
        const iframeDocument = iframe?.contentDocument;
        const formInFrame = iframeDocument?.getElementById("frm") as HTMLIFrameElement | null;
        if (formInFrame == oldElement) {
            return null;
        }
        oldElement = formInFrame;
        return formInFrame;
    }, async () => {
        console.log("------>>> old qq mail query iframe");
        await addCryptoBtnToComposeDivQQOldVersion(template);
    }, true);
}

async function addCryptoBtnToComposeDivQQOldVersion(template: HTMLTemplateElement) {
    const iframe = document.getElementById("mainFrameContainer")?.querySelector('iframe[name="mainFrame"]') as HTMLIFrameElement | null;
    const iframeDocument = iframe?.contentDocument || iframe?.contentWindow?.document;
    const composeForm = iframeDocument?.getElementById("frm") as HTMLElement | null;
    if (!composeForm) {
        console.log("------>>> no compose form found for qq mail of old version")
        return;
    }
    const mailContentIframe = composeForm.querySelector('iframe.qmEditorIfrmEditArea') as HTMLIFrameElement | null;
    const composeDocument = mailContentIframe?.contentDocument || mailContentIframe?.contentWindow?.document;
    if (!composeDocument) {
        console.log("----->>>  mail content frame not found for qq mail of old version");
        return;
    }

    const toolBarDiv = composeForm.querySelector(".toolbg.toolbgline");
    if (!toolBarDiv) {
        console.log("------>>> tool bar not found when compose mail");
        return;
    }
    const cryptoBtn = toolBarDiv.querySelector(".bmail-crypto-btn") as HTMLElement;
    if (cryptoBtn) {
        console.log("------>>> node already exists");
        return;
    }

    const sendDiv = toolBarDiv.querySelector('a[name="sendbtn"]') as HTMLElement;
    const title = browser.i18n.getMessage('crypto_and_send');
    const receiverTable = iframeDocument!.getElementById('addrsDiv') as HTMLElement;

    const mailContentDiv = await prepareMailContentOldVersion(composeDocument);

    const cryptoBtnDiv = parseCryptoMailBtn(template, 'file/logo_48.png', ".bmail-crypto-btn",
        title, 'bmail_crypto_btn_in_compose_qq_old', async _ => {
            await encryptMailAndSendQQOldVersion(mailContentDiv, receiverTable, sendDiv);
        }
    ) as HTMLElement;

    toolBarDiv.insertBefore(cryptoBtnDiv, toolBarDiv.children[2]);
    mailContentDiv.dataset.attachmentKeyId = prepareAttachmentForComposeOldVersion(iframeDocument as Document, template);
}

function findAttachmentKeyIDOldVersion(): Set<string> {
    const mySet = new Set<string>();
    const iframe = document.getElementById("mainFrameContainer")?.querySelector('iframe[name="mainFrame"]') as HTMLIFrameElement | null;
    const frameDoc = iframe?.contentDocument || iframe?.contentWindow?.document;
    if (!frameDoc) {
        return mySet;
    }
    const attachArea = frameDoc.getElementById("attachContainer")?.querySelectorAll('span[ui-type="filename"]')

    if (!attachArea || !attachArea.length) {
        return mySet;
    }

    for (let i = 0; i < attachArea.length; i++) {
        const element = attachArea.item(i) as HTMLElement;
        const fileName = element.innerText;
        console.log("--------------->>>>file name:", fileName);
        const parsedId = extractAesKeyId(fileName);
        if (!parsedId) {
            continue;
        }
        mySet.add(parsedId.id);
    }

    return mySet;
}

function prepareAttachmentForComposeOldVersion(frameDoc: Document, template: HTMLTemplateElement): string {

    const overlayButton = template.content.getElementById('attachmentOverlayButtonForQQOldVersion') as HTMLButtonElement | null;
    if (!overlayButton) {
        console.log("----->>> overlayButton not found");
        return "";
    }

    const attachmentToolBar = frameDoc.getElementById("composecontainer");
    const fileInput = attachmentToolBar?.querySelector('input[type="file"]') as HTMLInputElement;
    const attachmentDiv = attachmentToolBar?.querySelector(".compose_toolbtn.qmEditorAttach") as HTMLElement
    if (!fileInput || !attachmentDiv) {
        console.log("----->>> compose attachment tool bar not found");
        return "";
    }
    const overlyClone = overlayButton.cloneNode(true) as HTMLElement;
    overlyClone.children[0].textContent = browser.i18n.getMessage('bmail_attachment_encrypt_btn');
    const aekIdSet = findAttachmentKeyIDOldVersion();
    const aekId = addAttachmentEncryptBtn(fileInput, overlyClone, aekIdSet);
    attachmentDiv.appendChild(overlyClone);
    return aekId
}

const __bmailComposeDivId = "bmail-mail-body-for-qq";

async function prepareMailContentOldVersion(frameDoc: Document): Promise<HTMLElement> {
    // let bmailContentDiv = frameDoc.body.firstElementChild as HTMLElement;
    let bmailContentDiv = Array.from(frameDoc.body.children).find(
        (child) => child.tagName === 'DIV'
    ) as HTMLElement | undefined;

    if (!bmailContentDiv) {
        console.warn("------>>> should not lost mail content when compose");
        return frameDoc.body as HTMLElement;
    }

    if (!bmailContentDiv.classList.contains(__bmailComposeDivId)) {
        bmailContentDiv = document.createElement("div");
        bmailContentDiv.classList.add(__bmailComposeDivId);
        bmailContentDiv.appendChild(frameDoc.body.firstChild as HTMLElement);
        frameDoc.body.insertBefore(bmailContentDiv, frameDoc.body.firstChild);
    } else {
        const encryptedArea = bmailContentDiv.querySelector(`.${__bmail_mail_body_class_name}`) as HTMLElement | null;
        const hasEncryptedRawData = encryptedArea?.innerText.includes(MailFlag);
        if (encryptedArea && hasEncryptedRawData) {
            await decryptMailForEditionOfSentMail(encryptedArea, true);
        }
    }

    const replyOrQuoteDiv = frameDoc.querySelector("includetail") as HTMLElement | null;
    if (replyOrQuoteDiv) {
        if (replyOrQuoteDiv.children.length > 3) {
            bmailContentDiv.appendChild(replyOrQuoteDiv.children[0]);
            bmailContentDiv.appendChild(replyOrQuoteDiv.children[0]);
        }
    }

    return bmailContentDiv;
}

async function encryptMailAndSendQQOldVersion(mailBody: HTMLElement, receiverTable: HTMLElement, sendDiv: HTMLElement) {
    showLoading();
    try {
        const allEmailAddrDivs = receiverTable.querySelectorAll(".addr_base.addr_normal") as NodeListOf<HTMLElement>;
        const receiver = await processReceivers(allEmailAddrDivs, (div) => {
            return div.getAttribute('addr')?.trim() as string | null;
        });

        const aekId = mailBody.dataset.attachmentKeyId ?? "";
        const success = await encryptMailInComposing(mailBody, receiver, aekId);
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

async function monitorQQMailReadingOldVersion(template: HTMLTemplateElement) {
    let frameMainDiv = document.querySelector(".frame-main") as HTMLElement;
    if (frameMainDiv) {
        console.log("------>> this is new qq mail");
        return;
    }

    const div = document.getElementById("mainFrameContainer") as HTMLElement;
    let iframe = div.querySelector('iframe[name="mainFrame"]') as HTMLIFrameElement | null;
    if (!iframe) {
        return;
    }

    observeFrame(iframe, async (doc) => {
        await addCryptoBtnToReadingMailQQOldVersion(template, doc);
        addListenerForQuickReplyOldVersion(template, doc);
    });
}

function addListenerForQuickReplyOldVersion(template: HTMLTemplateElement, doc: Document) {
    const replyArea = doc.getElementById("QuickReplyPart");
    if (!replyArea) {
        console.log("------>>> reply area not found");
        return;
    }

    observeForElement(replyArea, 1000, () => {
        return doc.getElementById("rteContainer")?.querySelector("iframe") as HTMLIFrameElement
    }, async () => {
        console.log("------>>> quick reply area found");

        const iframe = doc.getElementById("rteContainer")?.querySelector("iframe") as HTMLIFrameElement
        const toolBarDiv = doc.getElementById("qmQuickReplyButtonContainer") as HTMLElement;
        const cryptoBtn = toolBarDiv.querySelector('.bmail-crypto-btn') as HTMLElement;

        if (cryptoBtn) {
            console.log("------>>> decrypt button already been added for quick reply frame");
            return;
        }

        const sendDiv = toolBarDiv.firstChild as HTMLElement;
        const title = browser.i18n.getMessage('crypto_and_send');
        const mailContentDiv = (iframe.contentDocument as Document).body as HTMLElement;

        const cryptoBtnDiv = parseCryptoMailBtn(template, 'file/logo_48.png', ".bmail-crypto-btn",
            title, 'bmail_crypto_btn_in_compose_qq_old', async _ => {
                const spansWithEAttribute = doc.querySelectorAll('span[e]') as NodeListOf<HTMLElement>; // 查询包含 e 属性的所有 span 元素

                const receiver = await processReceivers(spansWithEAttribute, (span) => {
                    return extractEmail(span.getAttribute('e') ?? "");
                });

                const elements = doc.querySelectorAll('div[data-has-decrypted="true"]') as NodeListOf<HTMLElement>;

                elements.forEach(bmailBody => {
                    decryptMailInReading(bmailBody, cryptoBtn).then();
                })

                const newMailBody = document.createElement("div");
                newMailBody.classList.add(__bmailComposeDivId);
                Array.from(mailContentDiv.children).forEach((child) => {
                    newMailBody.appendChild(child);
                });
                mailContentDiv.insertBefore(newMailBody, mailContentDiv.firstChild);

                const success = await encryptMailInComposing(newMailBody, receiver);
                if (!success) {
                    return;
                }

                sendDiv.click();

                const parentCryptoBtn = doc.querySelector(".bmail-decrypt-btn.bmail-decrypt-btn-qq_old") as HTMLElement;
                const mailArea = doc.getElementById("mailContentContainer") as HTMLElement;
                checkFrameBody(mailArea, parentCryptoBtn)
            }
        ) as HTMLElement;

        sendDiv.addEventListener('click', async () => {
            const elements = Array.from(doc.querySelectorAll('div[data-has-decrypted="true"]')) as HTMLElement[];
            for (const bmailBody of elements) {
                bmailBody.innerHTML = bmailBody.dataset.orignCrpted!;
            }
        }, true);

        toolBarDiv.insertBefore(cryptoBtnDiv, sendDiv);
    })
}

async function addCryptoBtnToReadingMailQQOldVersion(template: HTMLTemplateElement, doc: Document) {

    const parentDiv = doc.getElementById("mainmail") as HTMLElement;
    if (!parentDiv) {
        console.log("------>>> mail area not found [old version]");
        return
    }

    const toolBarDiv = doc.getElementById("toolbgline_top")?.querySelector(".nowrap.qm_left");
    if (!toolBarDiv) {
        console.log("------>>> tool bar not found [old version]");
        return
    }

    const decryptBtn = toolBarDiv.querySelector(__decrypt_button_css_name) as HTMLElement;
    if (decryptBtn) {
        console.log("------>>> decrypt button already been added for reading");
        return;
    }

    const mailArea = doc.getElementById("mailContentContainer");
    if (!mailArea) {
        console.log("------>>> no reading mail body found [old version]");
        return;
    }

    const nakedBmailTextDiv = findAllTextNodesWithEncryptedDiv(mailArea);
    nakedBmailTextDiv.forEach(wrappedDiv => {
        replaceTextNodeWithDiv(wrappedDiv as HTMLElement);
    })

    const cryptoBtnDiv = addDecryptButtonForBmailBody(template, mailArea, 'bmail_decrypt_btn_in_compose_qq_old') as HTMLElement;
    if (!cryptoBtnDiv) {
        return;
    }

    toolBarDiv.insertBefore(cryptoBtnDiv, toolBarDiv.children[1]);

    const editAgainButton = toolBarDiv.querySelector('a[ck="optMail"][opt="draft"]') as HTMLAnchorElement | null;
    addLoginCheckForEditAgainBtn(editAgainButton)

    addDecryptBtnForAttachmentOldVersion(template, doc);
}

function addDecryptBtnForAttachmentOldVersion(template: HTMLTemplateElement, doc: Document) {

    const attachmentDiv = doc.getElementById("attachment")?.querySelectorAll(".att_bt.attachitem");
    if (!attachmentDiv || attachmentDiv.length === 0) {
        console.log("------>>>", "no attachment found");
        return;
    }
    const bmailDownloadLi = template.content.getElementById("attachmentDecryptLinkQQOldVersion") as HTMLElement;

    for (let i = 0; i < attachmentDiv.length; i++) {
        const attachment = attachmentDiv[i] as HTMLElement;
        if (attachment.querySelector(".attachmentDecryptLinkQQOldVersion")) {
            continue;
        }

        const filename = attachment.querySelector(".name_big span")?.textContent;
        const parsedId = extractAesKeyId(filename);
        if (!parsedId) {
            console.log("------>>> no need to add decrypt button to this attachment element");
            continue;
        }

        const toolbarNodes = attachment.querySelector(".down_big")?.querySelectorAll("a")
        if (!toolbarNodes || toolbarNodes.length < 2) {
            console.log("------>>> download tool bar not found");
            continue;
        }
        const clone = bmailDownloadLi.cloneNode(true) as HTMLElement;
        const downBtn = toolbarNodes[1] as HTMLElement;
        clone.textContent = browser.i18n.getMessage('bmail_attachment_decrypt');
        addDecryptBtnToAttachmentItem(downBtn, clone, parsedId.id);
        downBtn.parentNode!.append(clone);
    }
}

class Provider implements ContentPageProvider {
    readCurrentMailAddress(): string {
        return queryEmailAddrQQ() ?? "";
    }

    async processAttachmentDownload(_fileName?: string, attachmentData?: any): Promise<void> {
        console.log("-------->>>", attachmentData)
        await downloadAndDecryptAgain(attachmentData);
    }
}

async function downloadAndDecryptAgain(attachmentData?: any) {
    if (!attachmentData) {
        console.log("------>>> miss parameters:downloadUrl");
        return;
    }
    const aesKey = loadAKForReading(attachmentData.aekID);
    if (!aesKey) {
        showTipsDialog("warn", browser.i18n.getMessage("bmail_file_key_invalid"))
        return;
    }

    const encryptedData = new Uint8Array(attachmentData.data);
    const fileName = attachmentData.fileName;
    decryptAttachmentFileData(encryptedData, aesKey, fileName);
    // console.log("------->>>> data size:=>", attachmentData.length);
}

// function monitorMsgTip(template: HTMLTemplateElement, mainArea: HTMLElement) {
//     const mainAppDiv = document.getElementById("mailMainApp") as HTMLElement;
//     const messageTipDiv = Array.from(mainAppDiv.querySelectorAll(".xm_mailPushTip_containerBox"));
//
//     if (!messageTipDiv || messageTipDiv.length === 0) {
//         const div = document.createElement('div')
//         div.classList.add('xm_mailPushTip_containerBox');
//         mainAppDiv.appendChild(div);
//         console.log("-------->>>add a push message tips box");
//         messageTipDiv.push(div);
//     }
//
//     messageTipDiv.forEach(message => {
//         message.addEventListener("click", () => {
//             setTimeout(() => {
//                 addCryptoBtnToReadingMailQQ(template, mainArea);
//             }, 1000)
//         });
//     });
// }


(window as any).contentPageProvider = new Provider();
setKeepAlive();
document.addEventListener('DOMContentLoaded', async () => {
    addCustomStyles('css/qq.css');
    const template = await parseContentHtml('html/inject_qq.html');
    appendForQQ(template);
    console.log("------>>> qq content init success");
});