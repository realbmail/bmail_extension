import {castToMemWallet, DbWallet, MailAddress, newWallet, loadWalletJsonFromDB, MailKey} from "./wallet";
import {__tableNameWallet, checkAndInitDatabase, databaseAddItem} from "./database";
import {sessionRemove, sessionSet} from "./session_storage";
import {
    __dbKey_cur_account_details,
    __dbKey_cur_addr,
    __dbKey_cur_key, __dbKey_uninstall_data,
    __key_wallet_status,
    WalletStatus
} from "./consts";
import browser from "webextension-polyfill";
import {decodeHex} from "./utils";

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
        await sessionRemove(__dbKey_cur_account_details)
        updateIcon(true);
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

    // await saveUninstallData(mKey);

    return mKey.address;
}

export class UninstallData {
    public address: string;
    public uTime: number;
    public signature: string | undefined;

    constructor(address: string, uTime: number) {
        this.address = address;
        this.uTime = uTime;
    }
}

async function saveUninstallData(mKey: MailKey) {

    const priData = mKey.rawPriKey();
    const unixTimestamp: number = Math.floor(Date.now() / 1000);
    const uData = new UninstallData(mKey.address.bmail_address, unixTimestamp)

    const encoder = new TextEncoder();
    const dataToSign = encoder.encode(JSON.stringify(uData));

    uData.signature = MailKey.signData(new Uint8Array(priData), dataToSign);
    await browser.storage.local.set({[__dbKey_uninstall_data]: uData})
}

export async function closeWallet(): Promise<void> {
    await sessionRemove(__key_wallet_status);
    await sessionRemove(__dbKey_cur_key);
    await sessionRemove(__dbKey_cur_addr);
    updateIcon(false);
}

export function updateIcon(isLoggedIn: boolean) {
    const iconPath = isLoggedIn ? ICON_PATHS.loggedIn : ICON_PATHS.loggedOut;
    browser.action.setIcon({path: iconPath}).then(() => {
        console.log("------>>>> set icon success");
    });
}