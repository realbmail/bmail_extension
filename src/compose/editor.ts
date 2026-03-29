// Quill editor type definition
declare global {
    interface Window {
        Quill: any;
    }
}

export interface EditorOptions {
    placeholder?: string;
    theme?: 'snow' | 'bubble';
    modules?: any;
}

export class ComposeEditor {
    private quill: any;

    constructor(container: HTMLElement, options: EditorOptions = {}) {
        const defaultOptions = {
            theme: 'snow',
            placeholder: '撰写邮件内容...',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'header': [1, 2, 3, false] }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'align': [] }],
                    ['link'],
                    [{ 'color': [] }, { 'background': [] }]
                ]
            }
        };

        if (!window.Quill) {
            throw new Error('Quill is not loaded. Please ensure Quill CDN is included in the HTML.');
        }

        this.quill = new window.Quill(container, {
            ...defaultOptions,
            ...options
        });
    }

    getHTML(): string {
        return this.quill.root.innerHTML;
    }

    getText(): string {
        return this.quill.getText();
    }

    setHTML(html: string): void {
        this.quill.root.innerHTML = html;
    }

    setText(text: string): void {
        this.quill.setText(text);
    }

    clear(): void {
        this.quill.setText('');
    }

    getLength(): number {
        return this.quill.getLength();
    }

    isEmpty(): boolean {
        return this.quill.getText().trim().length === 0;
    }

    onChange(callback: (content: string) => void): void {
        this.quill.on('text-change', () => {
            callback(this.getHTML());
        });
    }
}
