import {
    BMRequestToSrv,
    encodeHex, hideLoading,
    sendMessageToBackground,
    showLoading,
    showView,
    signDataByMessage
} from "./common";
import {sessionGet, sessionRemove, sessionSet} from "./session_storage";
import {
    __currentAccountAddress,
    __currentAccountData,
    hideDialog,
    router,
    showDialog,
    showToastMessage, UserLevel
} from "./main_common";
import {AccountOperation, BMailAccount} from "./proto/bmail_srv";
import browser from "webextension-polyfill";
import {MsgType} from "./consts";

export function initDashBoard(): void {
    const container = document.getElementById("view-main-dashboard") as HTMLDivElement;

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

    const closeButton = document.getElementById('dialog-tips-close-button') as HTMLButtonElement;
    closeButton.addEventListener('click', () => {
        hideDialog();
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
    })

    const exitBtn = container.querySelector(".bmail-wallet-exit-btn") as HTMLButtonElement
    exitBtn.addEventListener('click', async () => {
        await quitThisAccount();
    });

    const activeBtn = document.getElementById('bmail-active-account') as HTMLButtonElement;
    activeBtn.addEventListener('click', async () => {
        await activeCurrentAccount(activeBtn);
    });
}

export async function loadAndSetupAccount(force?: boolean) {
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
}


export async function populateDashboard() {
    try {
        showLoading();
        await loadAndSetupAccount();
        queryCurrentEmailAddr();
    } catch (err) {
        console.log("------>>> populate dashboard failed:", err);
    } finally {
        hideLoading();
    }
    // await loadContact();
}

async function quitThisAccount() {
    await sessionRemove(__currentAccountAddress);
    const rsp = await sendMessageToBackground(null, MsgType.WalletClose);
    if (!rsp || rsp.success <= 0) {
        showDialog("Error", "failed to quit");
        return
    }
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
    if (accountData.emails.length <= 0) {
        return;
    }

    const parentDiv = document.getElementById('binding-email-address-list') as HTMLElement;
    parentDiv.innerHTML = '';
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
            queryCurrentEmailAddr();
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

function queryCurrentEmailAddr() {
    browser.tabs.query({active: true, currentWindow: true}).then(tabList => {

        const activeTab = tabList[0];
        if (!activeTab || !activeTab.id) {
            console.log("------>>> invalid tab")
            return;
        }

        browser.tabs.sendMessage(activeTab.id, {action: MsgType.QueryCurEmail}).then(async response => {
            if (response && response.value) {
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
                }, {once: true})
            } else {
                console.log('------>>>Element not found or has no value');
            }
        });
    })
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