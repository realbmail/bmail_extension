import browser from "webextension-polyfill";
import {
    showView
} from "./utils";
import {checkAndInitDatabase, initDatabase} from "./database";
import {translateMainPage} from "./local";
import {getSystemSetting} from "./setting";
import {sessionGet} from "./session_storage";
import {router} from "./main_common";
import {initLoginDiv} from "./main_login";
import {initDashBoard} from "./main_dashboard";
import {WalletStatus} from "./consts";
import {loadWalletJsonFromDB} from "./wallet";
import {__dbKey_cur_key, __key_wallet_status} from "./consts";
import {initSetting} from "./main_setting";

document.addEventListener("DOMContentLoaded", initBMailExtension as EventListener);

async function initBMailExtension(): Promise<void> {
    await initDatabase();
    await getSystemSetting();
    await checkBackgroundStatus();
    initLoginDiv();
    initDashBoard();
    initSetting();
    translateMainPage();
}

async function checkBackgroundStatus(): Promise<void> {

    const status = await checkWalletStatus();

    switch (status) {
        case WalletStatus.NoWallet:
            browser.tabs.create({
                url: browser.runtime.getURL("html/home.html#onboarding/welcome")
            }).then();
            return;

        case WalletStatus.Locked:
        case WalletStatus.Expired:
            showView('#onboarding/main-login', router);
            return;

        case WalletStatus.Unlocked:
            showView('#onboarding/main-dashboard', router);
            return;
    }
}

async function checkWalletStatus(): Promise<WalletStatus> {

    await checkAndInitDatabase();

    let walletStatus = await sessionGet(__key_wallet_status) || WalletStatus.Init;
    if (walletStatus === WalletStatus.Init) {
        const wallet = await loadWalletJsonFromDB();
        if (!wallet) {
            return WalletStatus.NoWallet;
        }

        console.log('------>>> load active wallet:', wallet?.address.bmail_address);
        return WalletStatus.Locked;
    }

    if (walletStatus === WalletStatus.Unlocked) {
        const mKey = await sessionGet(__dbKey_cur_key) as Uint8Array;
        if (!mKey) {
            return WalletStatus.Locked;
        }
    }

    return walletStatus;
}