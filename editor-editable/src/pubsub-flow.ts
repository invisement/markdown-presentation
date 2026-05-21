export function setupFlow(dom: any, orch: any, editorEl: HTMLElement) {
    editorEl.addEventListener('beforeinput', (e) => {
        orch.handleInput(e as InputEvent);
    });
}
