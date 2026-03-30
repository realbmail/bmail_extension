export type FabMessageType =
    | "READY"
    | "SEND_EMAIL"
    | "SEND_EMAIL_RESPONSE"
    | "CLOSE_PANEL"
    | "PANEL_STATE"
    | "HOST_ACK"
    | "HOST_ERROR";

export interface SendEmailPayload {
    recipients: string[];
    subject: string;
    encryptedContent: string;
    metadata: {
        timestamp: number;
        version: string;
    };
}

export interface SendEmailResponsePayload {
    success: boolean;
    messageId?: string;
    error?: string;
}

export interface PanelStatePayload {
    open: boolean;
}

export interface HostAckPayload {
    receivedType: FabMessageType;
}

export interface HostErrorPayload {
    message: string;
}

export interface FabMessageMap {
    READY: null;
    SEND_EMAIL: SendEmailPayload;
    SEND_EMAIL_RESPONSE: SendEmailResponsePayload;
    CLOSE_PANEL: null;
    PANEL_STATE: PanelStatePayload;
    HOST_ACK: HostAckPayload;
    HOST_ERROR: HostErrorPayload;
}

export interface FabMessage<T extends FabMessageType = FabMessageType> {
    type: T;
    payload: FabMessageMap[T];
}
