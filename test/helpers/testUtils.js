let nextCombatEntityId = 1;

export function withMockedRandom(values, fn) {
  const original = Math.random;
  let i = 0;
  Math.random = () => {
    const value = values[Math.min(i, values.length - 1)];
    i += 1;
    return value;
  };

  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

export function withFixedRandom(value, fn) {
  return withMockedRandom([value], fn);
}

export function withPatchedProperty(target, key, value, fn) {
  const original = target[key];
  target[key] = value;
  try {
    return fn();
  } finally {
    target[key] = original;
  }
}

export function withPatchedMethod(target, key, implementation) {
  return (fn) => withPatchedProperty(target, key, implementation, fn);
}

export function createMockCanvasContext() {
  if (typeof globalThis.Path2D === 'undefined') {
    globalThis.Path2D = class Path2D {
      moveTo() {}
      lineTo() {}
      quadraticCurveTo() {}
      closePath() {}
      rect() {}
      addPath() {}
    };
  }

  const calls = [];
  const createGradient = (...args) => {
    const stops = [];
    calls.push(['createLinearGradient', ...args]);
    return {
      addColorStop: (...stopArgs) => {
        stops.push(stopArgs);
        calls.push(['addColorStop', ...stopArgs]);
      },
      stops,
    };
  };
  const ctx = {
    calls,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    shadowColor: '',
    shadowBlur: 0,
    beginPath: () => calls.push(['beginPath']),
    closePath: () => calls.push(['closePath']),
    save: () => calls.push(['save']),
    restore: () => calls.push(['restore']),
    clip: (...args) => calls.push(['clip', ...args]),
    fill: (...args) => calls.push(['fill', ...args]),
    stroke: (...args) => calls.push(['stroke', ...args]),
    moveTo: (...args) => calls.push(['moveTo', ...args]),
    lineTo: (...args) => calls.push(['lineTo', ...args]),
    quadraticCurveTo: (...args) => calls.push(['quadraticCurveTo', ...args]),
    arc: (...args) => calls.push(['arc', ...args]),
    ellipse: (...args) => calls.push(['ellipse', ...args]),
    fillRect: (...args) => calls.push(['fillRect', ...args]),
    strokeRect: (...args) => calls.push(['strokeRect', ...args]),
    fillText: (...args) => calls.push(['fillText', ...args]),
    setLineDash: (...args) => calls.push(['setLineDash', ...args]),
    createLinearGradient: createGradient,
  };
  return ctx;
}

export function createCombatEntity(name, col, row, dead = false) {
  return {
    id: nextCombatEntityId++,
    constructor: { name },
    active: true,
    gridCol: col,
    gridRow: row,
    x: 0,
    y: 0,
    isDead: () => dead,
  };
}
