import {FabMessage, FabMessageType} from "./fab_injector/message_bus";

function postToHost<T extends FabMessageType>(type: T, payload: FabMessage<T>["payload"]): void {
    const message: FabMessage<T> = {type, payload};
    window.parent.postMessage(message, "*");
}

function appendLog(message: string): void {
    const log = document.getElementById("compose-log");
    if (!log) {
        return;
    }

    const entry = document.createElement("div");
    entry.textContent = message;
    log.prepend(entry);
}

function isHostAckMessage(message: FabMessage): message is FabMessage<"HOST_ACK"> {
    return message.type === "HOST_ACK";
}

function isHostErrorMessage(message: FabMessage): message is FabMessage<"HOST_ERROR"> {
    return message.type === "HOST_ERROR";
}

function isPanelStateMessage(message: FabMessage): message is FabMessage<"PANEL_STATE"> {
    return message.type === "PANEL_STATE";
}

function setupMessageListener(): void {
    window.addEventListener("message", (event: MessageEvent<unknown>) => {
        const message = event.data as FabMessage | undefined;
        if (!message || typeof message.type !== "string") {
            return;
        }

        if (isHostAckMessage(message)) {
            appendLog(`Host acknowledged ${message.payload.receivedType}`);
            return;
        }

        if (isHostErrorMessage(message)) {
            appendLog(`Host error: ${message.payload.message}`);
            return;
        }

        if (isPanelStateMessage(message)) {
            appendLog(`Panel state updated: ${message.payload.open ? "open" : "closed"}`);
        }
    });
}

function setupActions(): void {
    const sendButton = document.getElementById("compose-send-test");
    const closeButton = document.getElementById("compose-close-panel");

    sendButton?.addEventListener("click", () => {
        postToHost("SEND_EMAIL", {
            subject: "BMail sandbox handshake",
            ciphertext: "sandbox-ciphertext-placeholder",
        });
        appendLog("SEND_EMAIL dispatched to host");
    });

    closeButton?.addEventListener("click", () => {
        postToHost("CLOSE_PANEL", null);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setupMessageListener();
    setupActions();
    postToHost("READY", null);
    appendLog("Compose iframe booted and sent READY");
});
