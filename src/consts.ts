export enum MsgType {
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
    AdminAddress = 'AdminAddress',
    LocalAppNotInstall = "LocalAppNotInstall",
    KeyForLocalApp = "KeyForLocalApp"
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


export const __dbKey_cur_account_details: string = '__dbKey_cur_account_details__';
export const __key_wallet_status: string = '__key_wallet_status';
export const __dbKey_cur_key: string = '__dbKey_cur_key__';
export const __dbKey_cur_addr: string = '__dbKey_cur_addr__';
export const __bmail_mail_body_class_name = "bmail-encrypted-data-wrapper"
export const ExtensionDownloadLink = "https://chromewebstore.google.com/detail/bmail/kjlhomfbkgfkkfdpcolkecfanmipiiic"
export const HostAppDownloadLink = "https://mail.simplenets.org/file/BMailApp_Installer.pkg"

export const API_Bind_Email = "/bind_account"
export const API_Unbind_Email = "/unbind_account"
export const API_Query_By_EMails = "/query_by_email_array"
export const API_Query_Bmail_Details = "/query_account"
export const API_Active_Account = "/account_active"
export const API_Active_By_Email = "/active_by_email"
export const API_Decrypt_By_Admin = "/decrypt_by_admin"

export const Local_App_Nonce = "40981a5dc01567a287e10214c4b17f428bdb308b4dc3a968"