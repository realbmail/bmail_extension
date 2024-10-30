import {
    BMRequestToSrv,
    encodeHex, hideLoading,
    sendMessageToBackground,
    showLoading,
    showView,
    signDataByMessage
} from "./utils";
import {sessionGet, sessionRemove, sessionSet} from "./session_storage";
import {
    __currentAccountAddress,
    __currentAccountData,
    initDialogAction,
    router,
    showDialog,
    showToastMessage, UserLevel
} from "./main_common";
import {AccountOperation, BMailAccount} from "./proto/bmail_srv";
import browser from "webextension-polyfill";
import {MsgType} from "./consts";
import {closeWallet} from "./wallet_util";

export function initDashBoard(): void {
    const container = document.getElementById("view-main-dashboard") as HTMLDivElement;
    initDialogAction();
    setupDashboardHeader(container);
    setupSettingMenu(container);
}

function setupDashboardHeader(container: HTMLDivElement) {
    const reloadBindingBtn = container.querySelector(".bmail-address-query-btn") as HTMLButtonElement;
    reloadBindingBtn.addEventListener('click', async () => {
        try {
            showLoading();
            await loadAndSetupAccount(true);
        } catch (error) {
            console.log("------>> load setup account error:=>", error);
        } finally {
            hideLoading();
        }
    });

    const addrValDiv = document.getElementById("bmail-address-val") as HTMLElement;
    addrValDiv.addEventListener('click', () => {
        const address = addrValDiv.innerText.trim();
        if (!address) {
            return;
        }
        navigator.clipboard.writeText(address).then(() => {
            showToastMessage("copy success");
        });
    });

    const activeBtn = document.getElementById('bmail-active-account') as HTMLButtonElement;
    activeBtn.addEventListener('click', async () => {
        await activeCurrentAccount(activeBtn);
    });
}

function setupSettingMenu(container: HTMLElement) {

    const settingMenu = container.querySelector(".bmail-setting-list") as HTMLElement;

    const settingShowBtn = container.querySelector('.bmail-system-setting-btn') as HTMLButtonElement;
    settingShowBtn.addEventListener('click', () => {
        settingMenu.style.display = "block";
    });

    const networkSetting = container.querySelector(".bmail-network-setting") as HTMLElement;
    networkSetting.addEventListener('click', (event) => {
        event.preventDefault();
        settingMenu.style.display = "none";
        showView('#onboarding/network-setting', router);
    });

    const exitBtn = container.querySelector(".bmail-wallet-exit-btn") as HTMLElement
    exitBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        settingMenu.style.display = "none";
        await quitThisAccount();
    });

    container.addEventListener('click', (event) => {
        if (!settingShowBtn.contains(event.target as Node)) {
            settingMenu.style.display = "none";
        }
    });
}

export async function loadAndSetupAccount(force?: boolean) {
    try {
        const accountAddr = await sessionGet(__currentAccountAddress);
        if (!accountAddr) {
            console.log("------>>>fatal logic error, no wallet found!");
            showView('#onboarding/main-login', router);
            return;
        }
        document.getElementById('bmail-address-val')!.textContent = accountAddr.bmail_address;

        const statusRsp = await sendMessageToBackground({
            address: accountAddr.bmail_address,
            force: force === true
        }, MsgType.QueryAccountDetails);
        if (statusRsp.success < 0) {
            console.log("------>>> account detail load failed")
            return;
        }

        const accountData = statusRsp.data as BMailAccount;
        // console.log("------>>> account query success:", accountData);
        setupElementByAccountData(accountData);
        await sessionSet(__currentAccountData, accountData);
    } catch (e) {
        console.log("------>>> query current account detail from server failed:=>", e);
    }
}

export async function populateDashboard() {
    try {
        showLoading();
        await loadAndSetupAccount();
        await checkCurrentEmailBindStatus();
    } catch (err) {
        console.log("------>>> populate dashboard failed:", err);
    } finally {
        hideLoading();
    }
}

async function quitThisAccount() {
    await sessionRemove(__currentAccountAddress);
    await closeWallet();
    showView('#onboarding/main-login', router);
}

function levelToStr(level: number) {
    switch (level) {
        case UserLevel.UserLevelInActive:
        default:
            return {name: browser.i18n.getMessage('user_level_Inactive'), url: "../file/level_inactive.png"};
        case UserLevel.UserLevelFree:
            return {name: browser.i18n.getMessage('user_level_free'), url: "../file/level_free.png"};
        case UserLevel.UserLevelBronze:
            return {name: browser.i18n.getMessage('user_level_normal'), url: "../file/level_bronze.png"};
        case UserLevel.UserLevelSilver:
            return {name: browser.i18n.getMessage('user_level_plus'), url: "../file/level_silver.png"};
        case UserLevel.UserLevelGold:
            return {name: browser.i18n.getMessage('user_level_enterprise'), url: "../file/level_gold.png"};
    }
}

function setupElementByAccountData(accountData: BMailAccount) {
    const imgElm = document.getElementById("bmail-account-level-img") as HTMLImageElement;
    const levelStr = document.getElementById('bmail-account-level-val') as HTMLElement;
    const levelInfo = levelToStr(accountData.level);
    levelStr.textContent = levelInfo.name;
    imgElm.src = levelInfo.url;

    if (accountData.level === 0) {
        document.getElementById('bmail-active-account')!.style.display = 'block';
    } else {
        document.getElementById('bmail-active-account')!.style.display = 'none';
    }

    if (!accountData.license) {
        document.getElementById('bmail-account-license-val')!.textContent = browser.i18n.getMessage('no_valid_license');
    } else {
        document.getElementById('bmail-account-license-val')!.textContent = browser.i18n.getMessage('valid_license_title');
    }

    const parentDiv = document.getElementById('binding-email-address-list') as HTMLElement;
    parentDiv.innerHTML = '';

    if (accountData.emails.length <= 0) {
        return;
    }

    const templateDiv = document.getElementById('binding-email-address-item') as HTMLElement;
    accountData.emails.forEach(email => {
        const clone = templateDiv.cloneNode(true) as HTMLElement;
        clone.style.display = "block";
        clone.removeAttribute('id');
        const button = clone.querySelector('button') as HTMLElement;
        button.addEventListener('click', async () => {
            const success = await mailBindingAction(true, email);
            if (success) {
                clone.parentNode?.removeChild(clone);
            }
        })
        const emailSpan = clone.querySelector('.binding-email-address-val') as HTMLElement
        emailSpan.innerText = email;
        parentDiv.append(clone);
    });
}

async function mailBindingAction(isUnbind: boolean, email: string): Promise<boolean> {
    showLoading();
    try {
        const data = {
            isUnbind: isUnbind,
            mail: email,
        }
        const rsp = await sendMessageToBackground(data, MsgType.BindAction);
        if (rsp.success < 0) {
            showDialog("error", rsp.message);
            return false;
        }
        await loadAndSetupAccount(true);
        if (isUnbind) {
            await checkCurrentEmailBindStatus();
        }
        return true;
    } catch (e) {
        showDialog("error", JSON.stringify(e));
        return false;
    } finally {
        hideLoading();
    }
}


async function hashEmailAddr(email: string): Promise<boolean> {

    const account = await sessionGet(__currentAccountData) as BMailAccount;
    if (!account) {
        return false;
    }

    if (account.emails.length <= 0) {
        return false;
    }

    for (let i = 0; i < account.emails.length; i++) {
        if (account.emails[i] === email) {
            return true;
        }
    }

    return false;
}

async function checkCurrentEmailBindStatus() {
    try {
        const tabList = await browser.tabs.query({active: true, currentWindow: true});
        const activeTab = tabList[0];
        if (!activeTab || !activeTab.id) {
            console.log("------>>> invalid tab")
            return;
        }

        const response = await browser.tabs.sendMessage(activeTab.id, {action: MsgType.QueryCurEmail});
        if (!response || !response.value) {
            console.log('------>>>Element not found or has no value');
            return;
        }

        console.log('------>>>Element Value:', response.value);
        const currentEmail = response.value;
        document.getElementById('bmail-email-address-val')!.textContent = currentEmail;
        const hasBind = await hashEmailAddr(currentEmail);
        if (hasBind) {
            return;
        }

        const bindOrUnbindBtn = document.getElementById('current-email-bind-btn') as HTMLElement;
        bindOrUnbindBtn.style.display = "block";
        bindOrUnbindBtn.addEventListener('click', async () => {
            const success = await mailBindingAction(false, currentEmail);
            if (success) {
                bindOrUnbindBtn.style.display = 'none';
            }
        }, {once: true});

    } catch (e) {
        console.log("------>>> query current email address error:=>", e);
    }
}

async function activeCurrentAccount(actBtn: HTMLButtonElement) {
    showLoading();
    try {
        const accountAddr = await sessionGet(__currentAccountAddress);
        if (!accountAddr) {
            console.log("------>>>fatal logic error, no wallet found!");
            showView('#onboarding/main-login', router);
            return;
        }
        const address = accountAddr.bmail_address;
        const payload: AccountOperation = AccountOperation.create({
            isDel: false,
            address: address,
        });

        const message = AccountOperation.encode(payload).finish()
        const signature = await signDataByMessage(encodeHex(message));
        if (!signature) {
            showDialog("error", "sign data failed");
            return;
        }

        const srvRsp = await BMRequestToSrv("/account_create", address, message, signature)
        console.log("------->>>fetch success:=>", srvRsp);
        actBtn.style.display = 'none';
        await loadAndSetupAccount(true);
    } catch (e) {
        console.log("------->>>fetch failed:=>", e);
        showDialog("error", JSON.stringify(e));
    } finally {
        hideLoading();
    }
}