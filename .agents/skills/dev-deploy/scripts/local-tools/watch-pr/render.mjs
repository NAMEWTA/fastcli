
export const renderJson = (verdict                  )         =>
  `${JSON.stringify(verdict)}\n`;
function ciCell(row              )         {
  if (row.kind !== "open") return "\u2014";
  const was = row.ci.hadPreviousPassingCi ? "，此前为 ✅" : "";
  switch (row.ci.kind) {
    case "ci-clean":
      return "✅";
    case "ci-pending":
      return `⏳ ${row.ci.pending.length} 项待完成${was}`;
    case "ci-failing":
      return `❌ ${row.ci.failed.length} 项失败${row.ci.pending.length ? `, ${row.ci.pending.length} 项待完成` : ""}${was}`;
    case "ci-github-rejected":
      return `❌ GitHub 报告检查失败${was}`;
    default: {
      const exhaustive        = row.ci;
      return exhaustive;
    }
  }
}
function reviewCell(row              )         {
  if (row.kind !== "open") return "\u2014";
  const open = row.threads.length;
  return row.reviewAutomationRunning
    ? open
      ? `🤖 正在运行，${open} 项未解决`
      : "🤖 正在运行"
    : open
      ? `📝 ${open} 项未解决`
      : "✅";
}
function mergeCell(row              )         {
  if (row.kind === "merged") return "✅ 已合并";
  if (row.kind === "closed") return "❌ 已关闭";
  if (row.facts.isDraft) return "⏸ 草稿";
  if (row.facts.reviewDecision === "CHANGES_REQUESTED")
    return "⚠️ 要求修改";
  return row.facts.mergeable === "CONFLICTING" ||
    row.facts.mergeStateStatus === "DIRTY" ||
    row.facts.mergeStateStatus === "CONFLICTING"
    ? "⚠️ 冲突"
    : "✅";
}
export function renderStatusTable(rows                          )         {
  const lines = ["| PR | CI | 审查 | 合并 |", "| --- | --- | --- | --- |"];
  for (const row of rows) {
    const url = `https://github.com/${row.context.owner}/${row.context.repo}/pull/${row.context.number}`;
    lines.push(
      `| [#${row.context.number}](${url}) | ${ciCell(row)} | ${reviewCell(row)} | ${mergeCell(row)} |`
    );
  }
  return `${lines.join("\n")}\n`;
}
function threadLine(thread                )         {
  const comment = thread.firstComment;
  return [
    thread.id,
    comment?.path ?? "None",
    comment?.line ?? "None",
    comment?.authorLogin ?? "None",
    `isBugBot=${thread.isBugbot}`,
    `bugbotReviewPasses=${thread.bugbotReviewPasses}`,
    (comment?.body ?? "").split(/\r?\n/, 1)[0]?.slice(0, 180) ?? "",
  ].join(" ");
}

function renderBlocker(blocker                                     )         {
  switch (blocker.kind) {
    case "merge-conflicts":
      return [
        "BLOCKER: merge-conflicts",
        `pr=${blocker.pr.number}`,
        `mergeable=${blocker.facts.mergeable}`,
        `mergeStateStatus=${blocker.facts.mergeStateStatus}`,
        "action=先解决合并冲突，再等待 CI",
      ].join("\n");
    case "review-threads":
      return [
        "BLOCKER: review-threads",
        `pr=${blocker.pr.number}`,
        `unresolved=${blocker.threads.length}`,
        ...blocker.threads.map(threadLine),
      ].join("\n");
    case "failing-checks": {
      const failed = blocker.ci.kind === "ci-failing" ? blocker.ci.failed : [];
      const details = failed.map(
        (check) =>
          `${check.name} ${check.reportedState} ${check.description} ${check.link}`
      );
      if (blocker.ci.kind === "ci-github-rejected")
        details.push(
          `mergeStateStatus=${blocker.ci.github.mergeStateStatus}`,
          `headRollupState=${blocker.ci.github.headRollupState}`
        );
      return [
        "BLOCKER: failing-checks",
        `pr=${blocker.pr.number}`,
        `failed=${failed.length}`,
        ...details,
      ].join("\n");
    }
    case "merge-gate": {
      const action =
        blocker.reason === "closed-without-merge"
          ? "恢复已关闭的 PR，或将其从队列堆叠移除"
          : blocker.reason === "draft-pr"
            ? "先将 PR 标记为可审查，再等待合并队列"
            : "先处理要求修改的审查，再等待合并队列";
      return [
        `BLOCKER: ${blocker.reason}`,
        `pr=${blocker.pr.number}`,
        `action=${action}`,
      ].join("\n");
    }
    case "status-query":
      return [
        "BLOCKER: status-query",
        `failures=${blocker.failures}`,
        `detail=${blocker.failure.detail}`,
        "action=检查当前 PR 上下文、GitHub 身份认证和 API 可用性，再重新启动观察",
      ].join("\n");
    default: {
      const exhaustive        = blocker;
      return exhaustive;
    }
  }
}
export function renderPretty(verdict                  )         {
  switch (verdict.kind) {
    case "QUEUE":
      return `QUEUE: 已记录 ${verdict.queue.length} 个 PR，按自底向上顺序： ${verdict.queue.map((pr) => `#${pr.number}`).join(",")}\n`;
    case "STATUS":
      return renderStatusTable(verdict.rows);
    case "WAITING":
      return verdict.reason.kind === "pending-checks"
        ? `WAITING: 前沿=#${verdict.frontier.number}；${verdict.reason.pending.length} 项检查待完成\n`
        : `WAITING: 前沿=#${verdict.frontier.number} 没有阻塞；等待合并队列（${verdict.reason.unmergedCount} 个 PR 未合并）\n`;
    case "ADVANCE":
      return `ADVANCE: 已合并 #${verdict.merged.number}；下一项=#${verdict.frontier.number}；剩余=${verdict.remaining}\n`;
    case "RETRY":
      return `RETRY: GitHub 状态查询失败；${verdict.retryInSeconds} 秒后重试\ndetail=${verdict.failure.detail}\n`;
    case "BLOCKER":
      return `${renderBlocker(verdict.blocker)}\n`;
    case "READY": {
      const detail =
        verdict.scope.kind === "single" && verdict.scope.pr.kind === "ready-pr"
          ? `\nmergeStateStatus=${verdict.scope.pr.proof.ci.github.mergeStateStatus}\nreviewDecision=${verdict.scope.pr.proof.gate.reviewDecision}\nisDraft=${verdict.scope.pr.proof.gate.draft === "draft-allowed"}${verdict.scope.pr.proof.gate.draft === "draft-allowed" ? "\nnote=已允许草稿（--allow-draft）；保持草稿，不标记为可审查" : ""}`
          : "";
      return `READY: 没有合并冲突、未解决的审查讨论、失败或待完成的检查${detail}\n`;
    }
    case "COMPLETE":
      return `COMPLETE: 队列堆叠已合并（${verdict.queue.length} 个 PR）\n`;
    case "TIMEOUT":
      if (verdict.reason.kind === "pending-checks")
        return "TIMEOUT: 检查仍待完成\n";
      if (verdict.reason.kind === "status-unavailable")
        return "TIMEOUT: GitHub 状态持续不可用\n";
      return `TIMEOUT: 队列堆叠仍有 ${verdict.reason.unmergedCount} 个 PR 未合并；前沿=#${verdict.reason.frontier.number}\n`;
    default: {
      const exhaustive        = verdict;
      return exhaustive;
    }
  }
}
