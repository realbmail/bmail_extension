import { Encryptor, EncryptedPackage } from './encryptor';

export interface SendOptions {
  recipients: string[];
  subject: string;
  content: string;
}

export interface SendResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

export class Sender {
  private static readonly SEND_TIMEOUT = 30000; // 30秒超时

  /**
   * 发送邮件
   */
  static async send(options: SendOptions): Promise<SendResult> {
    try {
      // 1. 验证输入
      const validation = this.validateInput(options);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // 2. 加密内容
      const encryptResult = await Encryptor.encrypt(
        options.content,
        options.recipients
      );

      if (!encryptResult.success || !encryptResult.encryptedPackage) {
        return {
          success: false,
          error: encryptResult.error || '加密失败'
        };
      }

      // 3. 构建消息
      const message = this.buildSendMessage(
        options.recipients,
        options.subject,
        encryptResult.encryptedPackage
      );

      // 4. 发送到宿主
      const result = await this.sendToHost(message);

      return result;
    } catch (error) {
      console.error('Send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '发送失败'
      };
    }
  }

  /**
   * 验证输入
   */
  private static validateInput(options: SendOptions): { valid: boolean; error?: string } {
    if (!options.recipients || options.recipients.length === 0) {
      return { valid: false, error: '请至少添加一个收件人' };
    }

    if (!options.subject || options.subject.trim().length === 0) {
      return { valid: false, error: '请输入邮件主题' };
    }

    // 检查内容是否为空
    // 移除 HTML 标签后检查是否有实际文本内容
    const textContent = options.content.replace(/<[^>]*>/g, '').trim();
    if (!textContent || textContent.length === 0) {
      return { valid: false, error: '邮件内容不能为空' };
    }

    return { valid: true };
  }

  /**
   * 构建发送消息
   */
  private static buildSendMessage(
    recipients: string[],
    subject: string,
    encryptedPackage: EncryptedPackage
  ) {
    return {
      type: 'SEND_EMAIL',
      payload: {
        recipients,
        subject,
        encryptedContent: Encryptor.serializePackage(encryptedPackage),
        metadata: {
          timestamp: Date.now(),
          version: encryptedPackage.version
        }
      }
    };
  }

  /**
   * 发送消息到宿主页面
   */
  private static async sendToHost(message: any): Promise<SendResult> {
    return new Promise((resolve) => {
      console.log('[sender] Setting up message listener and timeout');

      // 设置超时
      const timeout = setTimeout(() => {
        console.error('[sender] TIMEOUT: No response received after 30s');
        window.removeEventListener('message', responseHandler);
        resolve({
          success: false,
          error: '发送超时,请重试'
        });
      }, this.SEND_TIMEOUT);

      // 监听响应
      const responseHandler = (event: MessageEvent) => {
        console.log('[sender] Received message event:', {
          type: event.data?.type,
          origin: event.origin,
          data: event.data
        });

        if (event.data.type === 'SEND_EMAIL_RESPONSE') {
          console.log('[sender] ✓ Received SEND_EMAIL_RESPONSE:', event.data.payload);
          clearTimeout(timeout);
          window.removeEventListener('message', responseHandler);

          resolve({
            success: event.data.payload.success,
            error: event.data.payload.error,
            messageId: event.data.payload.messageId
          });
        } else if (event.data.type === 'HOST_ERROR') {
          console.error('[sender] ✗ Received HOST_ERROR:', event.data.payload);
          clearTimeout(timeout);
          window.removeEventListener('message', responseHandler);

          resolve({
            success: false,
            error: event.data.payload.message || '发送失败'
          });
        } else {
          console.log('[sender] Ignoring message with type:', event.data?.type);
        }
      };

      window.addEventListener('message', responseHandler);
      console.log('[sender] Message listener registered');

      // 发送消息
      window.parent.postMessage(message, '*');
      console.log('[sender] Sent SEND_EMAIL message to host:', message);
    });
  }
}
