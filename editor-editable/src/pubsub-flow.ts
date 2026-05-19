export function setupFlow(dom: any, orch: any, editorEl: HTMLElement) {
    editorEl.addEventListener('input', (e) => {
        orch.handleInput(e as InputEvent);
    });
}
