import {__currentDatabaseVersion, __tableSystemSetting, databaseUpdate, getMaxIdRecord} from "./database";
import {sessionGet, sessionRemove, sessionSet} from "./session_storage";
import {__dbKey_cur_account_details} from "./consts";

const __dbSystemSetting = "__db_key_system_setting__"

export class SysSetting {
    id: number;
    contactSrv: string;
    contactList: string[];

    constructor(id: number, contact: string, srvList: string[]) {
        this.id = id;
        this.contactSrv = contact;
        this.contactList = srvList;
    }

    async syncToDB(): Promise<void> {
        await databaseUpdate(__tableSystemSetting, this.id, this);
    }
}

export async function getSystemSetting(): Promise<SysSetting> {
    let ss = await sessionGet(__dbSystemSetting);
    if (ss) {
        return new SysSetting(ss.id, ss.contactSrv, ss.contactList);
    }

    ss = await getMaxIdRecord(__tableSystemSetting);
    let sObj;
    if (ss) {
        sObj = new SysSetting(ss.id, ss.contactSrv, ss.contactList);
    } else {
        sObj = new SysSetting(__currentDatabaseVersion, __officialContactSrv, [__officialContactSrv]);
    }

    await sessionSet(__dbSystemSetting, sObj);

    return sObj;
}

async function setSystemSetting(ss: SysSetting) {
    await sessionSet(__dbSystemSetting, ss);
    await ss.syncToDB();
}

export async function changeCurrentSrv(srv: string) {
    const sObj = await getSystemSetting();
    sObj.contactSrv = srv;
    await setSystemSetting(sObj);
    await sessionRemove(__dbKey_cur_account_details);
}

export async function addContactSrv(srv: string) {

    const sObj = await getSystemSetting();

    for (let i = 0; i < sObj.contactList.length; i++) {
        if (sObj.contactList[i] === srv) {
            throw Error(srv + " already exists");
        }
    }

    sObj.contactList.push(srv);
    await setSystemSetting(sObj);
}

// const httpServerUrl = "https://sharp-happy-grouse.ngrok-free.app"
// const httpServerUrl = "http://127.0.0.1:8001"
let __officialContactSrv = "https://bmail.simplenets.org:8443"

export async function getContactSrv(): Promise<string> {
    const ss = await getSystemSetting();
    return ss.contactSrv ?? __officialContactSrv;
}
