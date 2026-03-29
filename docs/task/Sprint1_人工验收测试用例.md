# Sprint 1 人工验收测试用例

**测试版本**: Sprint 1 - 基础设施与契约定义
**测试说明**: 本文档仅包含需要人工 UI 操作和视觉确认的测试用例

---

## 测试流程

### 人机协作模式

- **👤 你的职责**: 按步骤操作,截图,复制日志
- **🤖 AI 职责**: 分析你提供的截图和日志,判断是否通过

### 如何提交测试结果

每完成一个测试用例,按以下格式提交给 AI:

```
测试用例: TC-XX
截图: [粘贴截图]
控制台日志: [如果有,复制相关日志]
你的观察: [描述你看到的现象]
```

---

## 测试用例清单

| 编号 | 测试内容 | 测试站点 | 优先级 |
|------|---------|---------|--------|
| TC-01 | FAB 按钮显示与位置 | Gmail, Outlook, QQ, 163 | P0 |
| TC-02 | Shadow DOM 样式隔离 | Gmail | P0 |
| TC-03 | Iframe 侧滑显示 | Gmail | P0 |
| TC-04 | postMessage 通信测试 | Gmail | P0 |
| TC-05 | postMessage 安全性测试 | Gmail | P0 |
| TC-06 | 页面滚动兼容性 | Gmail | P1 |

---

## TC-01: FAB 按钮显示与位置

### 测试目标
确认 FAB 按钮在四个邮箱站点都能正确显示,位置固定在右下角

### 测试步骤

1. 打开 Chrome,确保 Bmail 扩展已加载
2. 依次访问以下站点:
   - https://mail.google.com (Gmail)
   - https://outlook.live.com 或 https://outlook.office.com (Outlook)
   - https://mail.qq.com (QQ邮箱)
   - https://mail.163.com (163邮箱)
3. 每个站点都截图整个页面,**确保截图中能看到 FAB 按钮**
4. 在 Gmail 页面,滚动到页面底部,再截图一次

### 提交给 AI

```
测试用例: TC-01

Gmail 截图: [粘贴]
Outlook 截图: [粘贴]
QQ邮箱截图: [粘贴]
163邮箱截图: [粘贴]
Gmail 滚动后截图: [粘贴]

你的观察:
- FAB 按钮在四个站点是否都显示: [是/否]
- 按钮位置是否一致: [是/否]
- 滚动后按钮是否保持固定: [是/否]
```

### AI 检查要点
- FAB 按钮在所有站点都显示
- 位置在屏幕右下角
- 滚动时保持固定位置

---

## TC-02: Shadow DOM 样式隔离

### 测试目标
确认 FAB 按钮使用 Shadow DOM,不受页面样式污染

### 测试步骤

1. 在 Gmail 页面,按 F12 打开 DevTools
2. 切换到 Console 面板
3. 复制粘贴以下代码并回车:

   **Gmail 专用代码** (兼容 Trusted Types 安全策略):
   ```javascript
   const style = document.createElement('style');
   style.textContent = '* { color: red !important; background: yellow !important; }';
   document.head.appendChild(style);
   ```

   **其他邮箱(QQ、163、Outlook)可使用**:
   ```javascript
   const style = document.createElement('style');
   style.innerHTML = '* { color: red !important; background: yellow !important; }';
   document.head.appendChild(style);
   ```

4. 观察页面变化
5. 截图整个页面,**重点关注 FAB 按钮和周围的页面元素**

**注意**:
- 在 Gmail 页面,由于 Trusted Types CSP 策略,必须使用 `textContent` 代替 `innerHTML`
- 在其他邮箱可以使用任一方式
- 两种方式都能验证 Shadow DOM 样式隔离效果

### 提交给 AI

```
测试用例: TC-02

执行样式污染后的截图: [粘贴]

你的观察:
- 页面其他元素是否变成红字黄底: [是/否]
- FAB 按钮是否保持原样: [是/否]
- 是否遇到 TrustedHTML 错误: [是/否]
```

### AI 检查要点
- 页面元素被污染(证明测试有效)
- FAB 按钮样式不受影响(Shadow DOM 隔离成功)
- 如果在 Gmail 上遇到 TrustedHTML 错误,使用 textContent 方案

---

## TC-03: Iframe 侧滑显示

### 测试目标
确认点击 FAB 后 Iframe 能以侧滑动画显示

### 测试步骤

1. 刷新 Gmail 页面(清除 TC-02 的样式污染)
2. 点击 FAB 按钮
3. 观察是否有侧边栏从右侧滑入
4. 截图 Iframe 显示状态
5. 按 F12 打开 DevTools
6. 切换到 Console 面板,查看是否有错误
7. 切换到 Network 面板,找到 `compose.html` 的请求
8. 截图 Console 和 Network 面板

### 提交给 AI

```
测试用例: TC-03

Iframe 显示截图: [粘贴整个页面,包含侧边栏]
Console 面板截图: [粘贴]
Network 面板截图: [粘贴 compose.html 的请求]

你的观察:
- 点击 FAB 后是否有侧边栏出现: [是/否]
- 侧滑动画是否流畅: [是/否]
- Console 是否有错误: [是/否,如果有请复制错误信息]
- compose.html 是否加载成功: [是/否,HTTP 状态码]
```

### AI 检查要点
- Iframe 成功显示
- compose.html 加载成功(HTTP 200)
- 无 CSP 拦截错误
- 无跨域错误

---

## TC-04: postMessage 通信测试

### 测试目标
确认 Iframe 和宿主页面能双向通信

### 前置条件检查

**如果找不到 compose.html 的 context,请先确认**:

1. **确认 Iframe 已加载**:
   - 点击 FAB 按钮,侧边栏应该从右侧滑入
   - 侧边栏顶部应显示 "BMail Compose Sandbox" 标题
   - 如果侧边栏没有出现,检查 Console 是否有错误

2. **确认 Iframe 元素存在**:
   - 在 DevTools Elements 面板中按 Ctrl+F (或 Cmd+F)
   - 搜索 "bmail-iframe"
   - 应该能找到一个 `<iframe>` 元素
   - 检查其 `src` 属性,应该是 `chrome-extension://...../html/compose.html`

3. **刷新页面重试**:
   - 如果上述检查都通过但仍找不到 context
   - 刷新页面,重新加载扩展
   - 再次点击 FAB 按钮打开侧边栏

### 测试步骤

1. 确保 Iframe 已打开(如果没有,点击 FAB 打开)
2. 在 DevTools 的 Console 面板顶部,找到 context 切换下拉菜单
   - 默认显示为 "top"
   - 点击下拉菜单
   - 查找包含 "compose.html" 或 "chrome-extension://" 的选项
3. 切换到 Iframe 的 context (通常显示为 compose.html)
4. 在 Console 中执行:
   ```javascript
   window.parent.postMessage({
     type: 'CLOSE_PANEL',
     payload: null
   }, '*');
   console.log('已从 Iframe 发送 CLOSE_PANEL 消息');
   ```
5. 观察侧边栏是否关闭
6. 切换回 top context
7. 查看 Console 中是否有 "Host acknowledged CLOSE_PANEL" 日志
8. 截图 Console 面板(包含发送和接收的日志)

**注意**: 当前系统支持的消息类型为:
- `READY`: Iframe 启动完成通知
- `CLOSE_PANEL`: 请求关闭侧边栏
- `SEND_EMAIL`: 发送邮件请求

测试时请使用这些已定义的消息类型。

### 提交给 AI

```
测试用例: TC-04

Console 截图: [粘贴,确保能看到发送和接收的日志]

你的观察:
- Iframe 是否成功发送消息: [是/否]
- 侧边栏是否关闭: [是/否]
- 宿主页面是否接收到消息: [是/否]
- 是否有错误: [是/否]

Console 日志内容:
[复制所有相关日志]
```

### AI 检查要点
- Iframe -> 宿主 通信成功
- 侧边栏成功关闭(证明消息被处理)
- Console 中有 "Host acknowledged CLOSE_PANEL" 日志
- 无跨域错误

---

## TC-05: postMessage 安全性测试

### 测试目标
确认 fab_injector 能拒绝非法来源的消息

### 测试步骤

1. 在 DevTools Console (top context) 中执行:
   ```javascript
   window.postMessage({
     type: 'MALICIOUS_MESSAGE',
     payload: { hack: 'attempt' }
   }, '*');
   console.log('已发送测试消息');
   ```
2. 观察 Console 输出
3. 查看是否有安全日志(如 "Rejected message" 或 "Invalid origin")
4. 截图 Console 面板

### 提交给 AI

```
测试用例: TC-05

Console 截图: [粘贴]

你的观察:
- 是否有安全相关的日志: [是/否]
- 消息是否被拒绝: [是/否]

Console 日志内容:
[复制所有日志]
```

### AI 检查要点
- 有 origin 校验逻辑
- 非法消息被拒绝或忽略
- 有安全日志记录

---

## TC-06: 页面滚动兼容性

### 测试目标
确认页面滚动时 FAB 和 Iframe 保持固定位置

### 测试步骤

1. 在 Gmail 页面,确保 Iframe 已打开
2. 滚动页面到顶部,截图
3. 滚动页面到中间,截图
4. 滚动页面到底部,截图

### 提交给 AI

```
测试用例: TC-06

页面顶部截图: [粘贴]
页面中间截图: [粘贴]
页面底部截图: [粘贴]

你的观察:
- FAB 按钮是否始终在屏幕右下角: [是/否]
- Iframe 是否始终固定在屏幕右侧: [是/否]
- 是否有视觉问题: [描述]
```

### AI 检查要点
- FAB 和 Iframe 使用 position: fixed
- 滚动时位置不变
- 无视觉错位

---

## 测试完成后

所有测试用例完成后,提交总结:

```
Sprint 1 人工测试总结
====================

通过的用例: TC-01, TC-02, ...
失败的用例: [如果有]

整体评价: [你的评价]
主要问题: [列出问题]
```

AI 将给出最终验收结论。
