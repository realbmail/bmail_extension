import {FabMessage, FabMessageType} from "./fab_injector/message_bus";
import {ComposeEditor} from "./compose/editor";
import {RecipientManager} from "./compose/recipient_manager";
import {Encryptor, EncryptedPackage} from "./compose/encryptor";

let editor: ComposeEditor | null = null;
let recipientManager: RecipientManager | null = null;
let currentEncryptedPackage: EncryptedPackage | null = null;

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

/**
 * 显示加密状态
 */
function showEncryptionStatus(message: string, type: 'loading' | 'success' | 'error'): void {
    const statusDiv = document.getElementById('encryption-status');
    if (!statusDiv) return;

    const statusText = statusDiv.querySelector('.status-text');
    if (statusText) {
        statusText.textContent = message;
    }

    statusDiv.style.display = 'block';

    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 2000);
    }
}

/**
 * 隐藏加密状态
 */
function hideEncryptionStatus(): void {
    const statusDiv = document.getElementById('encryption-status');
    if (statusDiv) {
        statusDiv.style.display = 'none';
    }
}

/**
 * 执行加密
 */
async function performEncryption(): Promise<boolean> {
    try {
        if (!editor) {
            appendLog('Error: Editor not initialized');
            return false;
        }

        if (!recipientManager) {
            appendLog('Error: Recipient manager not initialized');
            return false;
        }

        // 获取邮件内容
        const content = editor.getHTML();
        if (editor.isEmpty()) {
            appendLog('Error: Email content is empty');
            showEncryptionStatus('邮件内容不能为空', 'error');
            return false;
        }

        // 获取收件人列表
        const recipients = recipientManager.getValidEmails();
        if (recipients.length === 0) {
            appendLog('Error: No recipients added');
            showEncryptionStatus('请至少添加一个收件人', 'error');
            return false;
        }

        // 显示加密状态
        showEncryptionStatus('正在加密邮件...', 'loading');
        appendLog(`Encrypting email for ${recipients.length} recipient(s)...`);

        // 执行加密
        const result = await Encryptor.encrypt(content, recipients);

        if (!result.success) {
            hideEncryptionStatus();
            appendLog(`Encryption failed: ${result.error}`);
            return false;
        }

        // 保存加密包
        currentEncryptedPackage = result.encryptedPackage!;

        showEncryptionStatus('加密成功!', 'success');
        appendLog('✓ Encryption successful');
        appendLog(`  Version: ${currentEncryptedPackage.version}`);
        appendLog(`  Algorithm: ${currentEncryptedPackage.algorithm}`);
        appendLog(`  Content size: ${currentEncryptedPackage.encryptedContent.length} bytes`);

        return true;
    } catch (error) {
        hideEncryptionStatus();
        console.error('Encryption error:', error);
        appendLog(`Encryption error: ${error}`);
        return false;
    }
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

    sendButton?.addEventListener("click", async () => {
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

        // 执行加密
        const encryptSuccess = await performEncryption();
        if (!encryptSuccess || !currentEncryptedPackage) {
            appendLog('Failed to encrypt email');
            return;
        }

        // 发送加密包
        const serializedPackage = Encryptor.serializePackage(currentEncryptedPackage);
        appendLog(`Sending to ${recipients.length} recipient(s): ${recipients.join(', ')}`);

        postToHost("SEND_EMAIL", {
            subject: "BMail encrypted email",
            ciphertext: serializedPackage,
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

(window as any).performEncryption = performEncryption;

(window as any).getEncryptedPackage = () => currentEncryptedPackage;

(window as any).Encryptor = Encryptor;

// 测试加密功能
(window as any).testEncryption = async () => {
    console.log('=== Testing Encryption ===');

    const testContent = '<p>This is a test email</p>';
    const testRecipients = ['test@example.com'];

    const result = await Encryptor.encrypt(testContent, testRecipients);

    console.log('Encryption result:', result);

    if (result.success && result.encryptedPackage) {
        console.log('Serialized package:', Encryptor.serializePackage(result.encryptedPackage));
        console.log('Package validation:', Encryptor.validatePackage(result.encryptedPackage));
    }
};
