export function setupFlow(orch: any, editorEl: HTMLElement) {
    editorEl.addEventListener('input', (e) => {
        orch.handleInput(e as InputEvent);
    });
}
