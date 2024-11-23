import {castToMemWallet, DbWallet, MailAddress, newWallet, loadWalletJsonFromDB} from "./wallet";
import {__tableNameWallet, checkAndInitDatabase, databaseAddItem} from "./database";
import {sessionRemove, sessionSet} from "./session_storage";
import {__dbKey_cur_addr, __dbKey_cur_key, __key_wallet_status, WalletStatus} from "./consts";
import browser from "webextension-polyfill";

const ICON_PATHS = {
    loggedIn: {
        "16": "../file/logo_16.png",
        "48": "../file/logo_48.png",
        "128": "../file/logo_128.png"
    },
    loggedOut: {
        "16": "../file/logo_16_out.png",
        "48": "../file/logo_48_out-black.png",
        "128": "../file/logo_128_out.png"
    }
};

export async function createNewWallet(mnemonic: string, password: string): Promise<DbWallet | null> {
    try {
        await checkAndInitDatabase();
        const wallet = newWallet(mnemonic, password);
        await databaseAddItem(__tableNameWallet, wallet);
        const mKey = castToMemWallet(password, wallet);
        await sessionSet(__key_wallet_status, WalletStatus.Unlocked);
        await sessionSet(__dbKey_cur_key, mKey.rawPriKey());
        await sessionSet(__dbKey_cur_addr, mKey.address);
        return wallet;
    } catch (error) {
        console.log("------>>>creating wallet failed:", error);
        return null;
    }
}

export async function openWallet(pwd: string): Promise<MailAddress | null> {
    await checkAndInitDatabase();
    const wallet = await loadWalletJsonFromDB();
    if (!wallet) {
        await sessionSet(__key_wallet_status, WalletStatus.NoWallet);
        return null;
    }

    const mKey = castToMemWallet(pwd, wallet);
    await sessionSet(__key_wallet_status, WalletStatus.Unlocked);
    await sessionSet(__dbKey_cur_key, mKey.rawPriKey());
    await sessionSet(__dbKey_cur_addr, mKey.address);
    updateIcon(true);
    return mKey.address;
}

export async function closeWallet(): Promise<void> {
    await sessionRemove(__key_wallet_status);
    await sessionRemove(__dbKey_cur_key);
    await sessionRemove(__dbKey_cur_addr);
    updateIcon(false);
}

export function updateIcon(isLoggedIn: boolean) {
    const iconPath = isLoggedIn ? ICON_PATHS.loggedIn : ICON_PATHS.loggedOut;
    browser.action.setIcon({path: iconPath}).then();
}