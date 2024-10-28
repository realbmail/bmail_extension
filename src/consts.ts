export enum MsgType {
    WalletCreate = 'WalletCreate',
    WalletOpen = 'WalletOpen',
    WalletClose = 'WalletClose',
    EncryptData = 'EncryptData',
    DecryptData = 'DecryptData',
    BMailInbox = 'BMailInbox',
    QueryCurEmail = 'QueryCurEmail',
    BMailDownload = 'BMailDownload',
    EmailAddrToBmailAddr = 'EmailAddrToBmailAddr',
    CheckIfLogin = 'CheckIfLogin',
    SignData = 'SignData',
    QueryAccountDetails = 'QueryAccountDetails',
    IfBindThisEmail = 'IfBindThisEmail',
    OpenPlugin = 'OpenPlugin',
    BindAction = 'BindAction',
    QueryCurBMail = 'QueryCurBMail',
    SetEmailByInjection = 'SetEmailByInjection',
    KeepAlive = 'KeepAlive',
}

export enum WalletStatus {
    Init = 'Init',
    NoWallet = 'NoWallet',
    Locked = 'Locked',
    Unlocked = 'Unlocked',
    Expired = 'Expired'
}

export const Inject_Msg_Flag = "BMAIL_INJECTION_MSG_ORIGIN";
export const Plugin_Request_Timeout = 20_000;
export const ECWalletClosed = -1
export const ECEncryptedFailed = -3
export const ECDecryptFailed = -4
export const ECNoValidMailReceiver = -5
export const ECQueryBmailFailed = -6
export const ECInvalidEmailAddress = -7
export const ECInternalError = -1007
export const AttachmentFileSuffix = "bmail"