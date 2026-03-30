import { MailSiteAdapter, EnvironmentInfo, SendResult } from './AdapterInterface';

/**
 * Mock 适配器用于开发和测试
 * 模拟邮件发送流程,不实际与邮箱站点交互
 */
export class MockMailSiteAdapter implements MailSiteAdapter {
  readCurrentEnvironment(): EnvironmentInfo {
    return {
      site: 'mock',
      emailAddress: 'mock@example.com',
      displayName: 'Mock User',
      hasComposeSurface: true,
      hasReadingSurface: false,
      metadata: {
        mockMode: true
      }
    };
  }

  async fillAndSend(ciphertext: string, subject: string): Promise<SendResult> {
    console.log('[MockAdapter] fillAndSend called:', { subject, ciphertextLength: ciphertext.length });

    // 模拟异步发送过程
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('[MockAdapter] Send completed successfully');

    return {
      status: 'sent',
      triggerMethod: 'manual',
      message: '邮件已发送(Mock模式)',
      didFillComposer: true
    };
  }

  findEncryptedContainers(): HTMLElement[] {
    return [];
  }
}
