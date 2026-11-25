import { spawn } from "node:child_process";

// 仅接收本次创建的分离子进程 PID；不按进程名或全局 Java 名称清理。
export async function killGroup(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return;
  if (process.platform === "win32") {
    const status = await new Promise((resolve) => {
      const child = spawn("taskkill", ["/pid", String(pid), "/t", "/f"], { stdio: "ignore", windowsHide: true });
      child.once("error", () => resolve(null));
      child.once("close", resolve);
    });
    if (status !== 0) {
      try { process.kill(pid, "SIGKILL"); }
      catch (error) { if (error.code !== "ESRCH") throw error; }
    }
    return;
  }
  try { process.kill(-pid, "SIGKILL"); }
  catch (error) { if (error.code !== "ESRCH") throw error; }
}
