import { daymarkOrigin } from './core.js';

const NEWS_URL = 'https://aihot.news/api/v1/hot-topics';
let newsPending;
const daymarkPending = new Map();

async function readNews() {
  const { newsCache: cache } = await chrome.storage.local.get('newsCache');
  if (cache?.retryAt > Date.now()) return cache;
  try {
    const response = await fetch(NEWS_URL, { headers: cache?.etag ? { 'If-None-Match': cache.etag } : {}, credentials: 'omit', signal: AbortSignal.timeout(12000) });
    const ttl = Math.max(300, Number(response.headers.get('Cache-Control')?.match(/s-maxage=(\d+)/)?.[1] || 0)) * 1000;
    if (response.status === 304 && cache?.items) {
      const next = { ...cache, retryAt: Date.now() + ttl, checkedAt: Date.now(), error: '', failures: 0 };
      await chrome.storage.local.set({ newsCache: next });
      return next;
    }
    if (!response.ok) {
      const retry = response.headers.get('Retry-After');
      const delay = /^\d+$/.test(retry || '') ? Number(retry) * 1000 : Math.max(0, Date.parse(retry) - Date.now()) || 0;
      const failures = (cache?.failures || 0) + 1;
      let error = `暂时无法更新（HTTP ${response.status}）`;
      if ([566, 567].includes(response.status)) {
        const problem = await response.json().catch(() => ({}));
        error = `AIHOT 安全防护暂时拦截，稍后重试${problem.requestId ? '；请求号 ' + problem.requestId : ''}。持续失败可查看官方接入说明。`;
      }
      const next = { ...cache, retryAt: Date.now() + Math.max(Math.min(3600000, 300000 * 2 ** Math.min(failures - 1, 4)), delay), error, failures };
      await chrome.storage.local.set({ newsCache: next });
      return next;
    }
    const data = await response.json();
    if (!Array.isArray(data.items)) throw new Error('热点数据格式有变化');
    const next = { items: data.items.slice(0, 3), etag: response.headers.get('ETag'), checkedAt: Date.now(), retryAt: Date.now() + ttl, error: '', failures: 0 };
    await chrome.storage.local.set({ newsCache: next });
    return next;
  } catch {
    const failures = (cache?.failures || 0) + 1;
    const next = { ...cache, retryAt: Date.now() + Math.min(3600000, 300000 * 2 ** Math.min(failures - 1, 4)), error: '网络不可用，稍后自动重试', failures };
    await chrome.storage.local.set({ newsCache: next });
    return next;
  }
}

async function readDaymark() {
  const { settings } = await chrome.storage.local.get('settings');
  if (!settings?.daymarkUrl) throw new Error('尚未填写 DayMark 地址');
  const origin = daymarkOrigin(settings.daymarkUrl);
  if (daymarkPending.has(origin)) return daymarkPending.get(origin);
  const pending = (async () => {
    const responses = await Promise.all(['/api/today', '/api/settings'].map(path => fetch(origin + path, { credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(10000) })));
    if (responses.some(r => r.status === 401)) throw new Error('请先在 DayMark 网页登录，再返回刷新。');
    if (responses.some(r => !r.ok)) throw new Error('无法读取 DayMark，请检查地址和服务。');
    const [today, preferences] = await Promise.all(responses.map(r => r.json()));
    if (!Array.isArray(today.tasks) || !preferences.timezone) throw new Error('DayMark 接口格式不匹配');
    return { tasks: today.tasks, timezone: preferences.timezone };
  })();
  daymarkPending.set(origin, pending);
  try { return await pending; } finally { daymarkPending.delete(origin); }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;
  let work;
  if (message.type === 'news') {
    if (!newsPending) newsPending = readNews().finally(() => { newsPending = null; });
    work = newsPending;
  } else if (message.type === 'daymark') work = readDaymark();
  else return;
  work.then(data => sendResponse({ data }), error => sendResponse({ error: error.message || '连接失败' }));
  return true;
});
