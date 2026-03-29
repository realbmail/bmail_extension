export interface Recipient {
  email: string;
  displayName?: string;
  isValid: boolean;
}

export class RecipientManager {
  private recipients: Recipient[] = [];
  private container: HTMLElement | null = null;
  private onChangeCallback?: (recipients: Recipient[]) => void;

  constructor() {
    this.recipients = [];
  }

  /**
   * 验证邮箱格式
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * 添加收件人
   */
  addRecipient(email: string): boolean {
    const trimmedEmail = email.trim().toLowerCase();

    // 验证邮箱格式
    if (!RecipientManager.validateEmail(trimmedEmail)) {
      console.error('Invalid email format:', trimmedEmail);
      return false;
    }

    // 检查是否已存在
    if (this.recipients.some(r => r.email === trimmedEmail)) {
      console.warn('Recipient already exists:', trimmedEmail);
      return false;
    }

    // 添加收件人
    this.recipients.push({
      email: trimmedEmail,
      isValid: true
    });

    this.notifyChange();
    this.renderRecipientList();
    return true;
  }

  /**
   * 删除收件人
   */
  removeRecipient(email: string): void {
    const index = this.recipients.findIndex(r => r.email === email);
    if (index !== -1) {
      this.recipients.splice(index, 1);
      this.notifyChange();
      this.renderRecipientList();
    }
  }

  /**
   * 获取所有收件人
   */
  getRecipients(): Recipient[] {
    return [...this.recipients];
  }

  /**
   * 获取有效的收件人邮箱列表
   */
  getValidEmails(): string[] {
    return this.recipients
      .filter(r => r.isValid)
      .map(r => r.email);
  }

  /**
   * 清空所有收件人
   */
  clear(): void {
    this.recipients = [];
    this.notifyChange();
    this.renderRecipientList();
  }

  /**
   * 监听收件人变化
   */
  onChange(callback: (recipients: Recipient[]) => void): void {
    this.onChangeCallback = callback;
  }

  /**
   * 通知收件人变化
   */
  private notifyChange(): void {
    if (this.onChangeCallback) {
      this.onChangeCallback(this.getRecipients());
    }
  }

  /**
   * 渲染收件人管理 UI
   */
  render(container: HTMLElement): void {
    this.container = container;

    container.innerHTML = `
      <div class="recipient-manager">
        <div class="recipient-input-section">
          <label for="recipient-input">收件人:</label>
          <div class="input-group">
            <input
              type="email"
              id="recipient-input"
              placeholder="输入收件人邮箱地址"
              class="recipient-input"
            />
            <button id="add-recipient-btn" class="btn-add">添加</button>
          </div>
          <div id="recipient-error" class="error-message"></div>
        </div>

        <div class="recipient-list-section">
          <label>已添加收件人 (<span id="recipient-count">0</span>):</label>
          <div id="recipient-list" class="recipient-list"></div>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.renderRecipientList();
  }

  /**
   * 绑定事件监听器
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    const input = this.container.querySelector('#recipient-input') as HTMLInputElement;
    const addBtn = this.container.querySelector('#add-recipient-btn') as HTMLButtonElement;
    const errorDiv = this.container.querySelector('#recipient-error') as HTMLDivElement;

    // 添加按钮点击事件
    addBtn?.addEventListener('click', () => {
      const email = input.value.trim();
      if (!email) {
        this.showError('请输入邮箱地址', errorDiv);
        return;
      }

      if (!RecipientManager.validateEmail(email)) {
        this.showError('邮箱格式不正确', errorDiv);
        return;
      }

      if (this.addRecipient(email)) {
        input.value = '';
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
      } else {
        this.showError('该收件人已存在', errorDiv);
      }
    });

    // 回车键添加
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addBtn?.click();
      }
    });

    // 输入时清除错误提示
    input?.addEventListener('input', () => {
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
    });
  }

  /**
   * 显示错误信息
   */
  private showError(message: string, errorDiv: HTMLElement): void {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }

  /**
   * 渲染收件人列表
   */
  private renderRecipientList(): void {
    if (!this.container) return;

    const listContainer = this.container.querySelector('#recipient-list') as HTMLElement;
    const countSpan = this.container.querySelector('#recipient-count') as HTMLElement;

    if (!listContainer || !countSpan) return;

    countSpan.textContent = this.recipients.length.toString();

    if (this.recipients.length === 0) {
      listContainer.innerHTML = '<div class="empty-message">暂无收件人</div>';
      return;
    }

    listContainer.innerHTML = this.recipients.map(recipient => `
      <div class="recipient-item" data-email="${recipient.email}">
        <span class="recipient-icon">✉</span>
        <span class="recipient-email">${recipient.email}</span>
        <button class="btn-remove" data-email="${recipient.email}">×</button>
      </div>
    `).join('');

    // 绑定删除按钮事件
    listContainer.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const email = (e.target as HTMLElement).getAttribute('data-email');
        if (email) {
          this.removeRecipient(email);
        }
      });
    });
  }
}
