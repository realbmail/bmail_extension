import {parseBmailInboxBtn, parseCryptoMailBtn} from "./content_common";
import {emailRegex, MsgType, sendMessageToBackground} from "./common";
import browser from "webextension-polyfill";

export function appendForGoogle(template: HTMLTemplateElement) {
    const clone = parseBmailInboxBtn(template, 'bmail_left_menu_btn_google');
    if (!clone) {
        console.warn("------>>> failed to parse bmail inbox button");
        return
    }

    observeForElement(
        () => {
            return document.querySelector('.TK') as HTMLElement;
        }, () => {
            console.log("------>>>start to populate google area");
            addBMailInboxToMenu(clone);
            addCryptoBtnToComposeDiv(template);
            addActionForComposeBtn(template);
        });
}

function addBMailInboxToMenu(clone: HTMLElement) {
    const googleMenu = document.querySelector('.TK') as HTMLElement;
    googleMenu.insertBefore(clone, googleMenu.children[1]);
    console.log("------>>> add bmail inbox button success=>")
}

export function queryEmailAddrGoogle() {
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

function observeForElement(foundFunc: () => HTMLElement | null, callback: () => void) {
    const idleThreshold = 500; // 无变化的时间阈值（毫秒）
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const cb: MutationCallback = (mutationsList, observer) => {
        if (idleTimer) {
            clearTimeout(idleTimer);
        }
        const element = foundFunc();
        if (element) {
            idleTimer = setTimeout(() => {
                callback();
                console.log('---------->>> document body load finished');
                observer.disconnect();
            }, idleThreshold);
        }
    };

    const observer = new MutationObserver(cb);
    observer.observe(document.body, {childList: true, subtree: true});
}


const _composeBtnParentClass = "tr.btC"
function addCryptoBtnToComposeDiv(template: HTMLTemplateElement) {
    const allComposeDiv = document.querySelectorAll(_composeBtnParentClass);
    console.log("------>>> all compose div when loaded=>", allComposeDiv.length);
    allComposeDiv.forEach(trDiv => {
        const node = trDiv.querySelector(".bmail-crypto-btn");
        if (node) {
            console.log("------>>> node already exists");
            return;
        }
        const title = browser.i18n.getMessage('crypto_and_send');
        const clone = parseCryptoMailBtn(template, 'file/logo_16.png', ".bmail-crypto-btn", title,
            "bmail_crypto_btn_in_compose_google", encryptMailContent);
        if (!clone) {
            console.log("------>>> node not found");
            return;
        }
        const newTd = document.createElement('td');
        newTd.append(clone);

        const secondTd = trDiv.querySelector('td:nth-child(2)');
        if (secondTd) {
            trDiv.insertBefore(newTd, secondTd);
        }
    });
}

async function encryptMailContent(sendBtn: HTMLElement) {
    const statusRsp = await sendMessageToBackground('', MsgType.CheckIfLogin)
    if (statusRsp.success < 0) {
        return;
    }
}

function addActionForComposeBtn(template: HTMLTemplateElement) {
    const composBtn = document.querySelector(".T-I.T-I-KE.L3");
    if (!composBtn) {
        console.warn("------>>> compose button not found");
        return;
    }

    composBtn.addEventListener('click', () => {
        observeForElement(
            () => {
                const allComposeDiv = document.querySelectorAll(_composeBtnParentClass);
                if (allComposeDiv.length > 0) {
                    return allComposeDiv[allComposeDiv.length - 1] as HTMLElement;
                }
                return null;
            }, () => {
                addCryptoBtnToComposeDiv(template);
            });
    })
}