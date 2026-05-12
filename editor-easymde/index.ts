console.log('Husk Editor: index.ts loading...');
import { MarkdownEditor } from './mod.ts';

const editor = new MarkdownEditor();
const textarea = document.getElementById('editor') as HTMLTextAreaElement;
const saveBtn = document.getElementById('saveBtn');

// Initialize the editor
editor.init(textarea, {
    onChange: (val) => {
        // Just log for now
        console.log('Markdown length:', val.length);
        localStorage.setItem('husk_editor_draft', val);
    },
    onSave: () => {
        alert('Saved to LocalStorage! (In a real app, this would save to disk)');
        console.log('Saved content:', editor.getValue());
    }
});

// Load draft from localStorage
const draft = localStorage.getItem('husk_editor_draft');
if (draft) {
    editor.setValue(draft);
} else {
    editor.setValue('# Welcome to Husk Editor\n\nTry writing some markdown here!');
}

saveBtn?.addEventListener('click', () => {
    const val = editor.getValue();
    alert('Content Saved (simulated)');
    console.log(val);
});
