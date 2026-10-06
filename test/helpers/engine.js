export function makeFakeCanvas() {
    return { width: 800, height: 600, style: {}, viewportTransform: null, getContext: () => makeFakeCtx() };
}

export function makeFakeCtx() {
    const ops = [];
    const state = {
        fillStyle: null,
        strokeStyle: null,
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        lineWidth: 1,
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
    };

    return {
        ops,
        state,
        get fillStyle() { return state.fillStyle; },
        set fillStyle(value) { state.fillStyle = value; ops.push(['fillStyle', value]); },
        get strokeStyle() { return state.strokeStyle; },
        set strokeStyle(value) { state.strokeStyle = value; ops.push(['strokeStyle', value]); },
        get globalAlpha() { return state.globalAlpha; },
        set globalAlpha(value) { state.globalAlpha = value; ops.push(['globalAlpha', value]); },
        get globalCompositeOperation() { return state.globalCompositeOperation; },
        set globalCompositeOperation(value) { state.globalCompositeOperation = value; ops.push(['globalCompositeOperation', value]); },
        get lineWidth() { return state.lineWidth; },
        set lineWidth(value) { state.lineWidth = value; ops.push(['lineWidth', value]); },
        get font() { return state.font; },
        set font(value) { state.font = value; ops.push(['font', value]); },
        get textAlign() { return state.textAlign; },
        set textAlign(value) { state.textAlign = value; ops.push(['textAlign', value]); },
        get textBaseline() { return state.textBaseline; },
        set textBaseline(value) { state.textBaseline = value; ops.push(['textBaseline', value]); },
        fillRect(x, y, width, height) { ops.push(['fillRect', x, y, width, height]); },
        strokeRect(x, y, width, height) { ops.push(['strokeRect', x, y, width, height]); },
        clearRect(x, y, width, height) { ops.push(['clearRect', x, y, width, height]); },
        beginPath() { ops.push(['beginPath']); },
        arc(x, y, radius, start, end) { ops.push(['arc', x, y, radius, start, end]); },
        fill() { ops.push(['fill']); },
        stroke() { ops.push(['stroke']); },
        save() { ops.push(['save']); },
        restore() { ops.push(['restore']); },
        setTransform(a, b, c, d, e, f) { ops.push(['setTransform', a, b, c, d, e, f]); },
        fillText(text, x, y) { ops.push(['fillText', text, x, y]); },
        strokeText(text, x, y) { ops.push(['strokeText', text, x, y]); },
    };
}
