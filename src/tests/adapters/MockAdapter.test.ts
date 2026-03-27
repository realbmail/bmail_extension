import { MailSiteAdapter, EnvironmentInfo, SendResult } from '../../adapters/AdapterInterface';

/**
 * MockMailAdapter 仅用于验证 MailSiteAdapter 契约的可实现性。
 * 该文件不包含任何业务逻辑，也不应被打包进生产环境。
 */
class MockMailAdapter implements MailSiteAdapter {
    readCurrentEnvironment(): EnvironmentInfo {
        return {
            site: 'mock-site',
            emailAddress: 'test@example.com',
            hasComposeSurface: true,
            hasReadingSurface: true,
            metadata: {
                testKey: 'testValue'
            }
        };
    }

    async fillAndSend(ciphertext: string, subject: string): Promise<SendResult> {
        console.log(`Filling subject: ${subject} and ciphertext: ${ciphertext}`);
        return {
            status: 'sent',
            triggerMethod: 'dom-click',
            didFillComposer: true,
            message: 'Mock send successful'
        };
    }

    findEncryptedContainers(): HTMLElement[] {
        return [];
    }
}

// 类型验证
const adapter: MailSiteAdapter = new MockMailAdapter();
console.log('Mock adapter created successfully in test directory');
