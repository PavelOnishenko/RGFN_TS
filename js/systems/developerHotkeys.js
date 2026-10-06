function isEditableTarget(target) {
    if (!target || !(target instanceof HTMLElement)) {
        return false;
    }

    const tagName = target.tagName;
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
        return true;
    }

    return target.isContentEditable;
}

export function isBackquoteToggleEvent(event) {
    if (!event || event.code !== 'Backquote') {
        return false;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
        return false;
    }

    return !isEditableTarget(event.target);
}

export function registerBackquoteToggle(onToggle, options = {}) {
    const target = options.target ?? window;
    if (!target || typeof target.addEventListener !== 'function' || typeof onToggle !== 'function') {
        return () => {};
    }

    const handleKeydown = (event) => {
        if (!isBackquoteToggleEvent(event)) {
            return;
        }
        event.preventDefault();
        onToggle(event);
    };

    target.addEventListener('keydown', handleKeydown);
    return () => target.removeEventListener('keydown', handleKeydown);
}

export default registerBackquoteToggle;
