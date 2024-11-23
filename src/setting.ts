import {
    __tableSystemSetting,
    databaseGetByID,
    databaseUpdate
} from "./database";
import {sessionGet, sessionSet} from "./session_storage";

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

const __systemSettingVersion = 8;

export async function getSystemSetting(): Promise<SysSetting> {
    let ss = await sessionGet(__dbSystemSetting);
    if (ss) {
        return new SysSetting(ss.id, ss.contactSrv, ss.contactList);
    }

    ss = await databaseGetByID(__tableSystemSetting, __systemSettingVersion);
    let sObj;
    if (ss) {
        sObj = new SysSetting(ss.id, ss.contactSrv, ss.contactList);
    } else {
        sObj = new SysSetting(__systemSettingVersion, __officialContactSrv, [__officialContactSrv]);
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

export async function removeContractSrv(srv: string): Promise<boolean> {
    const sObj = await getSystemSetting();

    for (let i = 0; i < sObj.contactList.length; i++) {
        if (sObj.contactList[i] === srv) {
            sObj.contactList.splice(i, 1);
            break;
        }
    }

    let needUpdateSrv = false;
    if (sObj.contactSrv === srv) {
        if (sObj.contactList.length > 0) {
            sObj.contactSrv = sObj.contactList[0];
        } else {
            sObj.contactSrv = '';
        }
        needUpdateSrv = true;
    }

    await setSystemSetting(sObj);
    return needUpdateSrv;
}

// const httpServerUrl = "https://sharp-happy-grouse.ngrok-free.app"
// export const __officialContactSrv = "https://bc.simplenets.org"
export const __officialContactSrv = "http://127.0.0.1:8001"

export async function getContactSrv(): Promise<string> {
    const ss = await getSystemSetting();
    return ss.contactSrv ?? __officialContactSrv;
}
