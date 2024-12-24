import {Inject_Msg_Flag, MsgType} from "./consts";
import {
    __injectRequests, BmailError,
    EventData,
    injectCall,
    InjectRequest,
    InjectResult
} from "./inject_msg";

async function createBmailObj() {
    window.bmail = {
        version: '3.2.6',
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

