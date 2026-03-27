/**
 * Bmail V2 的瘦适配器契约。
 *
 * 适配器是 Bmail 与第三方邮箱站点之间的最小交互边界，只负责：
 * 1. 读取当前邮箱环境，为扩展提供上下文；
 * 2. 将密文与主题填充到宿主编辑器，并触发宿主站点的原生发送流程；
 * 3. 在阅读态定位被 Bmail 加密过的正文容器，供解密入口注入使用。
 *
 * 该文件只定义稳定契约，不包含任何站点实现细节。
 */

/**
 * 适配器允许携带的基础元数据值类型。
 */
export type AdapterMetadataValue = string | number | boolean | null;

/**
 * 发送流程中最终使用的触发方式。
 */
export type SendTriggerMethod =
    | "dom-click"
    | "synthetic-event"
    | "keyboard-shortcut"
    | "manual";

/**
 * 邮件发送结果状态。
 *
 * - `sent`: 已成功触发宿主站点的发送流程
 * - `manual-action-required`: 自动触发失败，但密文已保留在编辑器中，需用户手工完成最后一步
 * - `failed`: 未能完成正文填充或发送触发
 */
export type SendStatus = "sent" | "manual-action-required" | "failed";

/**
 * 当前邮箱宿主环境的运行时信息。
 */
export interface EnvironmentInfo {
    /**
     * 当前适配器对应的站点标识，例如 `gmail`、`outlook`、`qq`。
     */
    site: string;

    /**
     * 当前页面识别到的邮箱地址；若暂时无法识别则返回 `null`。
     */
    emailAddress: string | null;

    /**
     * 当前登录用户的展示名称；未知时返回 `null`。
     */
    displayName?: string | null;

    /**
     * 当前页面是否存在可写入的宿主编辑器。
     */
    hasComposeSurface: boolean;

    /**
     * 当前页面是否存在可扫描的阅读区域。
     */
    hasReadingSurface: boolean;

    /**
     * 供站点实现补充的轻量运行时信息。
     */
    metadata?: Record<string, AdapterMetadataValue>;
}

/**
 * 宿主站点发送动作的执行结果。
 */
export interface SendResult {
    /**
     * 当前发送流程的最终状态。
     */
    status: SendStatus;

    /**
     * 本次发送最终采用的触发方式；完全失败时可省略。
     */
    triggerMethod?: SendTriggerMethod;

    /**
     * 供上层展示或记录的说明信息。
     */
    message?: string;

    /**
     * 适配器是否已成功将主题与密文写入宿主编辑器。
     */
    didFillComposer: boolean;
}

/**
 * 所有邮箱厂商适配器都必须实现的统一契约。
 */
export interface MailSiteAdapter {
    /**
     * 读取当前邮箱站点的运行时环境。
     *
     * @returns 当前邮箱地址、宿主页面能力状态以及必要的附加元数据。
     */
    readCurrentEnvironment(): EnvironmentInfo;

    /**
     * 将加密后的正文和主题写入宿主编辑器，并尝试通过多级降级策略触发原生发送。
     *
     * @param ciphertext 加密后的邮件正文内容。
     * @param subject 邮件主题。
     * @returns 发送结果；实现方应在无法自动发送时返回 `manual-action-required`，
     * 并在彻底失败时返回 `failed` 或抛出 Promise reject。
     */
    fillAndSend(ciphertext: string, subject: string): Promise<SendResult>;

    /**
     * 在阅读态页面中查找被 Bmail 加密过的只读正文容器。
     *
     * @returns 匹配到的正文 DOM 容器列表，未找到时返回空数组。
     */
    findEncryptedContainers(): HTMLElement[];
}
