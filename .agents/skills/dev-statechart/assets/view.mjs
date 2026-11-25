const person = { first: "第一个请求", second: "第二个请求" };
const phase = { idle: "尚未读取", checked: "已读到余量", done: "已预留" };
export const title = "名额预留与并发交错";
export const state = (v) => [
  `剩余 ${v.available} 个名额`,
  ...Object.keys(person).map((a) => `${person[a]}${phase[v.phase[a]]}`),
].join("，");
export const step = (action, from, to) => {
  if (action === "Wait") return "等待";
  const actor = Object.keys(person).find((a) => from.phase[a] !== to.phase[a]);
  return `${person[actor] ?? "请求"}${action === "Read" ? "读取余量" : "提交预留"}`;
};
export const group = (v) => v.available < 0 ? "超额预留" : v.available === 0 ? "名额已用完" : "仍有余量";
export const colors = { "超额预留": "orange", "名额已用完": "teal", "仍有余量": "blue" };
