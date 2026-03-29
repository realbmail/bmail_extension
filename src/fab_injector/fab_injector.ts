import browser from "webextension-polyfill";
import {MailSiteAdapter} from "../adapters/AdapterInterface";
import {FabMessage, HostErrorPayload, SendEmailPayload} from "./message_bus";

declare global {
    interface Window {
        bmailMailSiteAdapter?: MailSiteAdapter;
    }
}

const FAB_HOST_ID = "bmail-fab-host";
const PANEL_WIDTH = 400;
const extensionPageUrl = browser.runtime.getURL("html/compose.html");
const extensionOrigin = new URL(extensionPageUrl).origin;

interface FabRuntime {
    isOpen: boolean;
    hasReceivedReady: boolean;
    host: HTMLElement;
    iframe: HTMLIFrameElement;
    setOpen: (nextOpen: boolean) => void;
}

let fabRuntime: FabRuntime | null = null;

function waitForDocumentBody(callback: () => void): void {
    if (document.body) {
        callback();
        return;
    }

    const observer = new MutationObserver(() => {
        if (!document.body) {
            return;
        }
        observer.disconnect();
        callback();
    });

    observer.observe(document.documentElement, {childList: true, subtree: true});
}

function postToIframe(iframe: HTMLIFrameElement, message: FabMessage): void {
    iframe.contentWindow?.postMessage(message, extensionOrigin);
}

function isSendEmailMessage(message: FabMessage): message is FabMessage<"SEND_EMAIL"> {
    return message.type === "SEND_EMAIL";
}

function emitHostError(iframe: HTMLIFrameElement, message: string): void {
    const payload: HostErrorPayload = {message};
    postToIframe(iframe, {type: "HOST_ERROR", payload});
}

function buildShadowMarkup(): string {
    return `
        <style>
            :host {
                all: initial;
            }

            .bmail-shell {
                position: fixed;
                inset: auto 24px 24px auto;
                z-index: 2147483647;
                pointer-events: none;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            .bmail-fab {
                pointer-events: auto;
                width: 56px;
                height: 56px;
                border: 0;
                border-radius: 999px;
                background: linear-gradient(135deg, #0f766e, #0ea5e9);
                color: #ffffff;
                box-shadow: 0 18px 40px rgba(15, 118, 110, 0.28);
                cursor: pointer;
                font-size: 30px;
                line-height: 1;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: transform 180ms ease, box-shadow 180ms ease;
            }

            .bmail-fab:hover {
                transform: translateY(-1px) scale(1.02);
                box-shadow: 0 22px 46px rgba(15, 118, 110, 0.34);
            }

            .bmail-fab:focus-visible,
            .bmail-close:focus-visible {
                outline: 2px solid #ffffff;
                outline-offset: 3px;
            }

            .bmail-overlay {
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.24);
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
                transition: opacity 220ms ease, visibility 220ms ease;
            }

            .bmail-panel {
                position: fixed;
                top: 0;
                right: 0;
                width: min(${PANEL_WIDTH}px, calc(100vw - 24px));
                max-width: 100vw;
                height: 100vh;
                background: #ffffff;
                box-shadow: -24px 0 48px rgba(15, 23, 42, 0.22);
                transform: translateX(calc(100% + 24px));
                transition: transform 240ms ease;
                display: flex;
                flex-direction: column;
                pointer-events: auto;
                overflow: hidden;
            }

            .bmail-panel-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 16px 18px;
                background: linear-gradient(135deg, #ecfeff, #f8fafc);
                border-bottom: 1px solid rgba(148, 163, 184, 0.25);
                color: #0f172a;
            }

            .bmail-panel-title {
                font-size: 14px;
                font-weight: 700;
                letter-spacing: 0.01em;
            }

            .bmail-panel-subtitle {
                margin-top: 4px;
                font-size: 12px;
                color: #475569;
            }

            .bmail-close {
                width: 36px;
                height: 36px;
                border: 0;
                border-radius: 999px;
                background: rgba(15, 23, 42, 0.06);
                color: #0f172a;
                font-size: 22px;
                cursor: pointer;
            }

            .bmail-iframe {
                flex: 1;
                width: 100%;
                border: 0;
                background: #ffffff;
            }

            .bmail-shell[data-open="true"] .bmail-overlay {
                opacity: 1;
                visibility: visible;
            }

            .bmail-shell[data-open="true"] .bmail-panel {
                transform: translateX(0);
            }

            @media (max-width: 640px) {
                .bmail-shell {
                    inset: auto 16px 16px auto;
                }

                .bmail-panel {
                    width: 100vw;
                }
            }
        </style>
        <div class="bmail-shell" data-open="false">
            <div class="bmail-overlay" part="overlay"></div>
            <aside class="bmail-panel" part="panel" aria-hidden="true">
                <div class="bmail-panel-header">
                    <div>
                        <div class="bmail-panel-title">BMail Compose Sandbox</div>
                        <div class="bmail-panel-subtitle">Isolated iframe workspace</div>
                    </div>
                    <button class="bmail-close" type="button" aria-label="Close panel">×</button>
                </div>
                <iframe
                    id="bmail-iframe"
                    class="bmail-iframe"
                    title="BMail Compose"
                    src="${extensionPageUrl}"
                    loading="eager"
                    referrerpolicy="no-referrer"
                ></iframe>
            </aside>
            <button class="bmail-fab" type="button" aria-label="Open BMail compose panel">+</button>
        </div>
    `;
}

function bindMessageBus(runtime: FabRuntime): void {
    window.addEventListener("message", async (event: MessageEvent<unknown>) => {
        if (event.source !== runtime.iframe.contentWindow) {
            return;
        }

        if (event.origin !== extensionOrigin) {
            console.warn("[bmail:fabricator] rejected message from unexpected origin:", event.origin);
            return;
        }

        const message = event.data as FabMessage | undefined;
        if (!message || typeof message.type !== "string") {
            emitHostError(runtime.iframe, "Invalid message payload.");
            return;
        }

        switch (message.type) {
            case "READY":
                runtime.hasReceivedReady = true;
                console.log("[bmail:debug] Received iframe message: READY");
                postToIframe(runtime.iframe, {
                    type: "HOST_ACK",
                    payload: {receivedType: "READY"},
                });
                console.log("[bmail:debug] Acknowledged iframe message: READY");
                postToIframe(runtime.iframe, {
                    type: "PANEL_STATE",
                    payload: {open: runtime.isOpen},
                });
                break;
            case "CLOSE_PANEL":
                console.log("[bmail:debug] Received iframe message: CLOSE_PANEL");
                runtime.setOpen(false);
                postToIframe(runtime.iframe, {
                    type: "HOST_ACK",
                    payload: {receivedType: "CLOSE_PANEL"},
                });
                console.log("[bmail:debug] Acknowledged iframe message: CLOSE_PANEL");
                break;
            case "SEND_EMAIL": {
                if (!isSendEmailMessage(message)) {
                    emitHostError(runtime.iframe, "Invalid SEND_EMAIL payload.");
                    return;
                }

                const adapter = window.bmailMailSiteAdapter;
                if (!adapter) {
                    emitHostError(runtime.iframe, "MailSiteAdapter is not registered yet.");
                    return;
                }

                try {
                    console.log("[bmail:debug] Received iframe message: SEND_EMAIL");
                    const payload: SendEmailPayload = message.payload;
                    const result = await adapter.fillAndSend(
                        payload.ciphertext,
                        payload.subject,
                    );
                    postToIframe(runtime.iframe, {
                        type: "HOST_ACK",
                        payload: {receivedType: "SEND_EMAIL"},
                    });
                    console.log("[bmail:debug] Acknowledged iframe message: SEND_EMAIL");
                    if (result.status === "sent") {
                        runtime.setOpen(false);
                    }
                } catch (error) {
                    const err = error as Error;
                    emitHostError(runtime.iframe, err.message || "Failed to send message.");
                }
                break;
            }
            default:
                emitHostError(runtime.iframe, `Unsupported message type: ${message.type}`);
        }
    });
}

function createFabRuntime(): FabRuntime {
    const host = document.createElement("div");
    host.id = FAB_HOST_ID;

    const shadowRoot = host.attachShadow({mode: "open"});
    shadowRoot.innerHTML = buildShadowMarkup();

    const shell = shadowRoot.querySelector(".bmail-shell") as HTMLElement;
    const fabButton = shadowRoot.querySelector(".bmail-fab") as HTMLButtonElement;
    const closeButton = shadowRoot.querySelector(".bmail-close") as HTMLButtonElement;
    const panel = shadowRoot.querySelector(".bmail-panel") as HTMLElement;
    const iframe = shadowRoot.querySelector(".bmail-iframe") as HTMLIFrameElement;

    const setOpen = (nextOpen: boolean) => {
        shell.dataset.open = String(nextOpen);
        panel.setAttribute("aria-hidden", String(!nextOpen));
        runtime.isOpen = nextOpen;

        // Debug: Check if body overflow is affected
        console.log('[bmail:debug] Panel state:', nextOpen ? 'open' : 'closed');
        console.log('[bmail:debug] Body overflow:', document.body.style.overflow || 'default');
        console.log('[bmail:debug] Body computed overflow:', window.getComputedStyle(document.body).overflow);

        postToIframe(iframe, {
            type: "PANEL_STATE",
            payload: {open: nextOpen},
        });
    };

    const runtime: FabRuntime = {
        isOpen: false,
        hasReceivedReady: false,
        host,
        iframe,
        setOpen,
    };

    fabButton.addEventListener("click", () => {
        setOpen(!runtime.isOpen);
    });

    closeButton.addEventListener("click", () => {
        setOpen(false);
    });

    document.addEventListener(
        "pointerdown",
        (event: PointerEvent) => {
            if (!runtime.isOpen) {
                return;
            }

            if (event.composedPath().includes(runtime.host)) {
                return;
            }

            setOpen(false);
        },
        true,
    );

    document.addEventListener("keydown", (event: KeyboardEvent) => {
        if (!runtime.isOpen || event.key !== "Escape") {
            return;
        }

        setOpen(false);
    });

    iframe.addEventListener("load", () => {
        console.log("[bmail:debug] compose iframe loaded:", extensionPageUrl);
        console.log("[bmail:debug] compose iframe contentWindow available:", Boolean(iframe.contentWindow));
        postToIframe(iframe, {
            type: "PANEL_STATE",
            payload: {open: runtime.isOpen},
        });
    });

    iframe.addEventListener("error", () => {
        console.error("[bmail:fabricator] compose iframe failed to load:", extensionPageUrl);
    });

    document.body.appendChild(host);

    // Debug: Check initial body state after FAB injection
    console.log('[bmail:debug] FAB injected successfully');
    console.log("[bmail:debug] compose iframe attached:", {
        hostId: host.id,
        iframeId: iframe.id,
        src: iframe.src,
    });
    console.log('[bmail:debug] Initial body overflow:', document.body.style.overflow || 'default');
    console.log('[bmail:debug] Initial body computed overflow:', window.getComputedStyle(document.body).overflow);

    window.setTimeout(() => {
        if (runtime.hasReceivedReady) {
            return;
        }
        console.warn("[bmail:debug] compose iframe did not send READY within 5000ms");
    }, 5000);

    bindMessageBus(runtime);

    return runtime;
}

export function initFabInjector(): void {
    if (fabRuntime || document.getElementById(FAB_HOST_ID)) {
        return;
    }

    waitForDocumentBody(() => {
        if (fabRuntime || document.getElementById(FAB_HOST_ID)) {
            return;
        }
        fabRuntime = createFabRuntime();
    });
}
