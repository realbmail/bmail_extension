import {Inject_Msg_Flag, MailFlag, MsgType} from "./consts";
import {
    __injectRequests, BmailError,
    EventData,
    injectCall,
    InjectRequest,
    InjectResult
} from "./inject_msg";

async function createBmailObj() {
    window.bmail = {
        version: '4.1.3',
        setupEmail: async function (userEmail: string): Promise<any> {
            return await injectCall(MsgType.SetEmailByInjection, {email: userEmail}, true);
        },
        connect: async function (): Promise<any> {
            return await injectCall(MsgType.QueryCurBMail, {}, true);
        },
        encryptMailTxt: async function (emailAddr: string[], plainTxt: string): Promise<any> {
            return await injectCall(MsgType.EncryptData, {emails: emailAddr, data: plainTxt}, true);
        },
        decryptMailTxt: async function (cipherText: string): Promise<any> {
            return await injectCall(MsgType.DecryptData, {data: cipherText}, true);
        }
    };

    console.log("++++++>>>bmail object inject success");
}

function dispatchMessage() {
    window.addEventListener("message", (event) => {
        if (event.source !== window || !event.data) return;

        const eventData = event.data as EventData;
        if (!eventData || eventData.flag !== Inject_Msg_Flag || eventData.toPlugin) return;

        console.log("-------->>> got message from background:=>", eventData.type)

        const processor = __injectRequests[eventData.id];
        if (!processor) {
            console.log("------>>> no processor for injection processor");
            return;
        }
        procResponse(processor, eventData);
        return;
    });
}

function initBmailInjection() {
    encryptQQNewVersionMailActionInject();
    createBmailObj().then();
    dispatchMessage();
}

initBmailInjection();

function procResponse(processor: InjectRequest, eventData: EventData) {
    const result = eventData.params as InjectResult;

    if (!result) {
        const error = new BmailError(-2, "No valid response").toJSON();
        processor.reject(error);
        delete __injectRequests[eventData.id];
        return;
    }

    if (!result.success || result.error) {
        processor.reject(result.error);
    } else {
        processor.resolve(result.data);
    }

    delete __injectRequests[eventData.id];
}


function encryptQQNewVersionMailActionInject() {
    console.log("------>>>✅ Bmail XHR 拦截器注入");
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (
        method: string,
        url: string | URL,
        async?: boolean,
        username?: string | null,
        password?: string | null
    ): void {
        (this as any)._bmail_method = method;
        (this as any)._bmail_url = typeof url === "string" ? url : url.toString();
        return originalOpen.call(this, method, url, async ?? true, username, password);
    };

    XMLHttpRequest.prototype.send = async function (
        body?: Document | BodyInit | null
    ): Promise<void> {
        const xhr = this as any;
        const method = xhr._bmail_method?.toUpperCase();
        const url = xhr._bmail_url;

        if (
            method === "POST" &&
            typeof url === "string" &&
            url.includes("/send/sendmail") &&
            typeof body === "string" &&
            body.includes("content=")
        ) {
            const params = new URLSearchParams(body);
            const funcType = params.get("func");
            const content = params.get("content");

            if (content && funcType === "2") {
                // console.log("------>>>✏️ 修改 content 字段（保存草稿）");
                const encryptedContent = await encryptContent(content); // 你自己的加密函数
                params.set("content", encryptedContent);

                const modifiedBody = params.toString();
                return originalSend.call(this, modifiedBody);
            }

            if (content && funcType === "1") {
                const encryptedContent = await encryptContent(content, false); // 你自己的加密函数
                // console.log("------>>>✉️ 修改 content 字段（发送邮件）:");
                params.set("content", encryptedContent);

                const modifiedBody = params.toString();
                return originalSend.call(this, modifiedBody);
            }
        }

        return originalSend.call(this, body as XMLHttpRequestBodyInit | null);
    };
}

async function encryptContent(content: string, isDraft: boolean = true): Promise<string> {
    if (isDraft) {
        return `<div style="color:red">[Encrypted By BMail]</div>`;
    }
    if (content.includes(MailFlag)) {
        return content;
    }
    // console.log("------>>> content to encrypt:", content);
    const encryptData = await injectCall(MsgType.QQNewVersionEncrypt, {content: content}, true)
    return encryptData as string;
}