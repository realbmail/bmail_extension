import {FabMessage, FabMessageType} from "./fab_injector/message_bus";
import {ComposeEditor} from "./compose/editor";
import {RecipientManager} from "./compose/recipient_manager";

let editor: ComposeEditor | null = null;
let recipientManager: RecipientManager | null = null;

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

function initRecipientManager(): void {
    const container = document.getElementById('recipient-container');
    if (!container) {
        appendLog('Error: Recipient container not found');
        return;
    }

    try {
        recipientManager = new RecipientManager();
        recipientManager.render(container);

        // 监听收件人变化
        recipientManager.onChange((recipients) => {
            console.log('Recipients changed:', recipients);
        });

        appendLog('Recipient manager initialized successfully');
    } catch (error) {
        appendLog(`Error initializing recipient manager: ${error}`);
    }
}

function initEditor(): void {
    const container = document.getElementById('editor-container');
    if (!container) {
        appendLog('Error: Editor container not found');
        return;
    }

    try {
        editor = new ComposeEditor(container, {
            placeholder: '撰写邮件内容...'
        });

        // 监听内容变化
        editor.onChange((content) => {
            console.log('Content changed:', content.substring(0, 50));
        });

        appendLog('Editor initialized successfully');
    } catch (error) {
        appendLog(`Error initializing editor: ${error}`);
    }
}

function setupActions(): void {
    const sendButton = document.getElementById("compose-send-test");
    const closeButton = document.getElementById("compose-close-panel");

    sendButton?.addEventListener("click", () => {
        if (!editor) {
            appendLog('Error: Editor not initialized');
            return;
        }

        if (!recipientManager) {
            appendLog('Error: Recipient manager not initialized');
            return;
        }

        const recipients = recipientManager.getValidEmails();
        if (recipients.length === 0) {
            appendLog('Error: No recipients added');
            return;
        }

        if (editor.isEmpty()) {
            appendLog('Error: Email content is empty');
            return;
        }

        const emailContent = editor.getHTML();
        appendLog(`Sending to ${recipients.length} recipient(s): ${recipients.join(', ')}`);

        postToHost("SEND_EMAIL", {
            subject: "BMail encrypted email",
            ciphertext: emailContent,
        });
        appendLog("SEND_EMAIL dispatched to host");
    });

    closeButton?.addEventListener("click", () => {
        postToHost("CLOSE_PANEL", null);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setupMessageListener();
    initRecipientManager();
    initEditor();
    setupActions();
    postToHost("READY", null);
    appendLog("Compose iframe booted and sent READY");
});

// 导出给 DevTools Console 使用
(window as any).getRecipients = () => {
    return recipientManager?.getValidEmails() || [];
};
