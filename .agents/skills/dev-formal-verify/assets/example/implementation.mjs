// 用于演示的真实纯函数；每次调用作为枚举器的一个原子步骤。
export function State(available = 1, phases = [0, 0], held = []) {
  return Object.freeze({
    available,
    phases: Object.freeze([...phases]),
    held: Object.freeze([...new Set(held)].sort((a, b) => a - b)),
  });
}

export function readAvailable(state, actor) {
  if (state.phases[actor] !== 0 || state.available < 1) return null;
  const phases = [...state.phases];
  phases[actor] = 1;
  return State(state.available, phases, state.held);
}

export function commitReservation(state, actor) {
  if (state.phases[actor] !== 1) return null;
  // 必须在提交这一原子步骤中重新检查，不能沿用先前读取结果。
  if (state.available < 1) { // 故障注入只移除此处保护。
    return null;
  }
  const phases = [...state.phases];
  phases[actor] = 2;
  return State(state.available - 1, phases, [...state.held, actor]);
}
