/* 采购申请证据示例：无网络请求、生产操作或持久化存储；刷新恢复初始数据。 */
(() => {
  const one = (selector) => document.querySelector(selector);
  const all = (selector) => [...document.querySelectorAll(selector)];
  let dialogTrigger;
  all('[data-open-dialog]').forEach((button) => button.addEventListener('click', () => {
    dialogTrigger = button;
    const dialog = document.getElementById(button.dataset.openDialog);
    dialog?.showModal();
  }));
  all('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
  all('dialog').forEach((dialog) => dialog.addEventListener('close', () => dialogTrigger?.focus()));

  if (document.body.dataset.template === 'enterprise-data') {
    const rows = all('[data-request]');
    const selection = () => {
      const visible = rows.filter((row) => !row.hidden);
      const chosen = visible.filter((row) => row.querySelector('input').checked);
      one('[data-batch]').disabled = chosen.length === 0;
      one('[data-batch]').textContent = chosen.length ? `批准所选 ${chosen.length} 项申请` : '批准所选申请';
      one('[data-select-all]').checked = visible.length > 0 && chosen.length === visible.length;
      one('[data-select-all]').indeterminate = chosen.length > 0 && chosen.length < visible.length;
      return chosen;
    };
    const filter = () => {
      const term = one('[data-search]').value.trim().toLowerCase();
      const status = one('[data-status-filter]').value;
      rows.forEach((row) => {
        row.hidden = !row.textContent.toLowerCase().includes(term) || (status !== 'all' && row.dataset.state !== status);
        if (row.hidden) row.querySelector('input').checked = false;
      });
      const count = rows.filter((row) => !row.hidden).length;
      one('[data-count]').textContent = `显示 ${count} 项申请 · 本地示例数据`;
      one('[data-empty]').hidden = count > 0;
      selection();
    };
    one('[data-search]').addEventListener('input', filter);
    one('[data-status-filter]').addEventListener('change', filter);
    rows.forEach((row) => row.querySelector('input').addEventListener('change', selection));
    one('[data-select-all]').addEventListener('change', (event) => {
      rows.filter((row) => !row.hidden).forEach((row) => { row.querySelector('input').checked = event.target.checked; });
      selection();
    });
    one('[data-batch]').addEventListener('click', () => {
      const chosen = selection();
      if (one('[data-failure]').checked) {
        one('[data-feedback]').textContent = '批准未能完成。已保留当前选择；关闭失败模拟后重试。';
        one('[data-feedback]').classList.add('error');
        return;
      }
      chosen.forEach((row) => {
        row.dataset.state = 'approved';
        row.querySelector('[data-state-label]').textContent = '已批准';
        row.querySelector('[data-state-label]').className = 'pill good';
        row.querySelector('input').checked = false;
      });
      one('[data-feedback]').classList.remove('error');
      one('[data-feedback]').textContent = `已在本地示例中批准 ${chosen.length} 项申请。未修改任何公司记录。`;
      filter();
    });
    let ascending = true;
    one('[data-sort]').addEventListener('click', () => {
      ascending = !ascending;
      const sorted = [...rows].sort((a, b) => (Number(a.dataset.amount) - Number(b.dataset.amount)) * (ascending ? 1 : -1));
      sorted.forEach((row) => one('tbody').append(row));
      one('[data-sort]').textContent = `金额 ${ascending ? '↑' : '↓'}`;
      one('[data-sort]').closest('th').setAttribute('aria-sort', ascending ? 'ascending' : 'descending');
    });
    all('[data-request-detail]').forEach((button) => button.addEventListener('click', () => {
      const row = button.closest('[data-request]');
      one('[data-detail-title]').textContent = row.querySelector('strong').textContent;
      one('[data-detail-owner]').textContent = row.dataset.owner;
      one('[data-detail-amount]').textContent = `$${Number(row.dataset.amount).toLocaleString('en-US')}`;
      one('[data-detail-state]').textContent = row.dataset.state === 'approved' ? '已批准' : '待审阅';
    }));
    filter();
  }
})();
