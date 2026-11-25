// 直接调用示例代码，穷举两个请求的读取与提交交错。
import { State, readAvailable, commitReservation } from "./implementation.mjs";

export function* initialStates() { yield State(); }

export function* transitions(state) {
  let moved = false;
  for (let actor = 0; actor < 2; actor += 1) {
    for (const [label, operation] of [["读取余量", readAvailable], ["提交预留", commitReservation]]) {
      const successor = operation(state, actor);
      if (successor !== null) {
        moved = true;
        yield [`请求 ${actor + 1} ${label}`, successor];
      }
    }
  }
  if (!moved) yield ["保持当前状态", state];
}

export const INVARIANTS = {
  NoOversell: (state) => state.available >= 0 && state.held.length <= 1,
  Conservation: (state) => state.available + state.held.length === 1,
  HeldMeansCommitted: (state) => state.held.every((actor) => state.phases[actor] === 2),
};

export function describe(state) {
  const phases = { 0: "未读取", 1: "已读到余量", 2: "已预留" };
  return `剩余 ${state.available}，请求 1 ${phases[state.phases[0]]}，请求 2 ${phases[state.phases[1]]}，已持有 ${state.held.length}`;
}
