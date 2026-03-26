import {populateDashboard} from "./main_dashboard";
import {populateSystemSetting} from "./main_setting";
import browser from "webextension-polyfill";
import {getContactSrv} from "./setting";
import {sprintf} from "./utils";

export const __currentAccountData = "__current_account_data_";


export enum UserLevel {
    UserLevelInActive = 0,
    UserLevelFree,
    UserLevelBronze,
    UserLevelSilver,
    UserLevelGold
}

export function router(path: string): void {
    if (path === '#onboarding/main-dashboard') {
        populateDashboard().then();
    } else if (path === '#onboarding/network-setting') {
        populateSystemSetting().then();
    }
}

export function hideDialog(): void {
    const dialogContainer = document.getElementById('dialog-tips-container') as HTMLDivElement;
    dialogContainer.style.display = 'none';
}

type dialogAction = () => Promise<boolean>;
let __dialogOkCallback: dialogAction | undefined;
let __dialogCancelCallback: dialogAction | undefined;

async function dialogOKAction() {
    if (__dialogOkCallback) {
        const closeTab = await __dialogOkCallback();
        if (closeTab) {
            hideDialog();
        }
        return;
    }
    hideDialog();
}

async function dialogCancelAction() {
    if (__dialogCancelCallback) {
        await __dialogCancelCallback()
    }
    hideDialog();
}

export function initDialogAction() {
    const closeButton = document.getElementById('dialog-tips-close-button') as HTMLButtonElement;
    closeButton.addEventListener('click', dialogCancelAction);
    const confirmButton = document.getElementById('dialog-tips-confirm-button') as HTMLButtonElement;
    confirmButton.addEventListener('click', dialogOKAction);
}

export function showDialog(title: string, message: string,
                           confirmButtonText?: string, confirmCallback?: dialogAction,
                           cancelCallback?: dialogAction): void {
    const dialogContainer = document.getElementById('dialog-tips-container') as HTMLDivElement;
    const dialogTitle = document.getElementById('dialog-tips-title') as HTMLHeadingElement;
    const dialogMessage = document.getElementById('dialog-tips-message') as HTMLParagraphElement;
    let confirmButton = document.getElementById('dialog-tips-confirm-button') as HTMLButtonElement;

    __dialogOkCallback = confirmCallback;
    __dialogCancelCallback = cancelCallback;

    dialogTitle.innerText = title;
    dialogMessage.innerText = message;
    if (confirmButtonText) {
        confirmButton.innerText = confirmButtonText;
    } else {
        confirmButton.innerText = 'OK';
    }
    dialogContainer.style.display = 'flex';
}

export function showToastMessage(content: string, timeOut?: number): void {
    const tipElement = document.getElementById('toast-tip-dialog');
    const contentElement = tipElement?.getElementsByClassName('tip-content')[0] as HTMLElement;

    if (contentElement) {
        contentElement.textContent = content;
    }

    if (tipElement) {
        tipElement.style.display = 'block';
        if (!timeOut) {
            timeOut = 2;
        }
        setTimeout(() => {
            tipElement.style.display = 'none';
        }, timeOut * 1000);
    }
}

export async function parseEmailTemplate(email: string, address: string, title: string, subTitle: string, description: string, buttonTxt: string): Promise<string> {
    const response = await fetch(browser.runtime.getURL('html/verify2.html'));
    if (!response.ok) {
        throw response;
    }
    const url = await getContactSrv();
    const htmlContent = await response.text();
    const mailBody = sprintf(htmlContent,
        title,
        subTitle,
        description,
        email,
        address,
        buttonTxt,
        browser.i18n.getMessage("active_mail_active_tips"),
        browser.i18n.getMessage("active_mail_question"),
        browser.i18n.getMessage("active_mail_footer"),
        url,
    );
    // console.log("----->>> mail body:", mailBody);
    return mailBody;
}