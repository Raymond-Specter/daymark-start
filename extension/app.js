import { webUrl, daymarkOrigin, searchTarget, clockParts, selectFocus } from './core.js';
import { setupPomodoro } from './pomodoro.js';
import { parseDuration } from './pomodoro-state.js';

const $ = id => document.getElementById(id);
const extension = !!globalThis.chrome?.runtime?.id;
const themes = ['midnight', 'paper', 'navy', 'forest', 'coffee'];
const defaults = { theme: 'midnight', engine: 'bing', pomodoroMinutes: 25, daymarkUrl: '', demo: false, showNews: true, links: [
  { name: 'Google', url: 'https://www.google.com' }, { name: 'GitHub', url: 'https://github.com' },
  { name: 'ChatGPT', url: 'https://chatgpt.com' }, { name: 'Notion', url: 'https://www.notion.so' },
  { name: '哔哩哔哩', url: 'https://www.bilibili.com' }, { name: 'YouTube', url: 'https://www.youtube.com' },
  { name: 'AIHOT', url: 'https://aihot.news' }
] };
let settings = { ...defaults };
let daymarkData = null;
let revision = 0;
const icons = {
  'github.com': '<path d="M9 19c-4 1-4-2-6-2m12 4v-4c0-1-.3-1.6-1-2 3-.4 6-1.6 6-6a5 5 0 0 0-1.3-3.4c.2-.9.2-2.3-.2-3.1-1.3 0-2.8.8-3.5 1.3a12 12 0 0 0-6 0C8.3 3.3 6.8 2.5 5.5 2.5c-.4.8-.4 2.2-.2 3.1A5 5 0 0 0 4 9c0 4.4 3 5.6 6 6-.7.4-1 1-1 2v4"/>',
  'chatgpt.com': '<path d="m12 3 7.8 4.5v9L12 21l-7.8-4.5v-9L12 3Zm0 5 3.5 2v4L12 16l-3.5-2v-4L12 8Zm0-5v5m7.8 8.5-4.3-2.5m-11.3 2.5L8.5 14"/>',
  'notion.so': '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 17V7l8 10V7"/>',
  'bilibili.com': '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="m8 2 3 4m5-4-3 4M8 11v4m8-4v4"/>',
  'youtube.com': '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3V9Z"/>',
  'aihot.news': '<path d="m13 2-8 11h6l-1 9 9-12h-6l1-8Z"/>',
  'google.com': '<circle cx="11" cy="11" r="7"/><path d="m17 17 4 4"/>'
};
const svg = paths => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
let themeFade;
let themeSave = Promise.resolve();

function applyTheme(theme, remember = false, animate = !remember) {
  const next = themes.includes(theme) ? theme : defaults.theme;
  const previous = getComputedStyle(document.body).backgroundColor;
  const changed = document.documentElement.dataset.theme !== next;
  themeFade?.cancel();
  document.documentElement.dataset.theme = next;
  if (remember) {
    try { localStorage.setItem('daymark-start-theme', next); }
    catch { /* The main settings store still retains the selected theme. */ }
  }
  if (animate && changed && document.body.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.style.setProperty('--theme-from', previous);
    themeFade = document.body.animate([{ opacity: 1 }, { opacity: 0 }], { pseudoElement: '::before', duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
}

function renderLinks() {
  $('shortcuts').replaceChildren();
  for (const link of settings.links) {
    let url;
    try { url = webUrl(link.url); } catch { continue; }
    const item = document.createElement('a');
    item.className = 'shortcut'; item.href = url.href; item.title = link.name; item.setAttribute('aria-label', link.name);
    const icon = document.createElement('span'); icon.className = 'shortcut-icon';
    const host = url.hostname.replace(/^www\./, '');
    if (icons[host]) icon.innerHTML = svg(icons[host]);
    else icon.textContent = link.name.slice(0, 1).toUpperCase();
    const name = document.createElement('span'); name.className = 'shortcut-name'; name.textContent = link.name;
    item.append(icon, name); $('shortcuts').append(item);
  }
  if (settings.links.length < 8) {
    const add = document.createElement('button'); add.className = 'shortcut'; add.setAttribute('aria-label', '添加常用网址');
    add.innerHTML = `<span class="shortcut-icon">${svg('<path d="M12 5v14M5 12h14"/>')}</span><span class="shortcut-name">添加</span>`;
    add.addEventListener('click', openSettings); $('shortcuts').append(add);
  }
}

function updateClock() {
  const now = new Date();
  $('time').textContent = clockParts(now).time;
  $('time').dateTime = now.toISOString();
  const dateParts = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric', weekday: 'long' }).formatToParts(now);
  $('date').textContent = dateParts.filter(part => part.type !== 'weekday').map(part => part.value).join('') + ' · ' + dateParts.find(part => part.type === 'weekday').value;
  if (daymarkData) renderFocus();
}

function renderFocus() {
  const result = selectFocus(daymarkData.tasks, new Date(), daymarkData.timezone);
  $('focus-type').textContent = result.task ? result.label : '现在';
  $('focus-time').textContent = result.task?.start_time ? `${result.task.start_time}${result.task.end_time ? ' – ' + result.task.end_time : ''}` : '';
  const blocked = daymarkData.tasks.filter(t => t.blocked && !['completed', 'cancelled'].includes(t.status)).length;
  $('focus-title').textContent = result.task?.title || (blocked ? '当前任务正在等待前置事项。' : '现在没有待办，留一点时间给自己。');
  $('focus-next').textContent = result.next ? `下一项 · ${result.next.start_time}  ${result.next.title}` : blocked ? `还有 ${blocked} 项等待前置任务完成，前往 DayMark 查看。` : result.task ? '按自己的节奏，把这一件做好。' : '没有可执行的未完成任务。';
}

async function readDaymark() {
  const ticket = revision;
  daymarkData = null;
  $('daymark-open').hidden = !settings.daymarkUrl;
  if (settings.daymarkUrl) $('daymark-open').href = settings.daymarkUrl;
  $('focus-time').textContent = ''; $('focus-type').textContent = '现在';
  if (settings.demo) {
    const now = clockParts(new Date());
    daymarkData = { timezone: 'Asia/Shanghai', tasks: [{ date: now.date, title: '把今天最重要的一件事做好', start_time: now.time, estimated_duration: 60, status: 'pending', priority: 1 }] };
    $('focus-state').textContent = '示例 · 非真实任务'; renderFocus(); return;
  }
  if (!settings.daymarkUrl) {
    $('focus-state').textContent = '未连接'; $('focus-title').textContent = '连接 DayMark，让下一步更清楚。';
    $('focus-next').textContent = '在右下角设置中填写你的 DayMark 地址。'; return;
  }
  $('focus-state').textContent = '连接中';
  $('focus-title').textContent = '正在读取今天的安排…'; $('focus-next').textContent = '';
  try {
    if (!extension) throw new Error('真实连接请加载浏览器插件，网页预览只用于查看样式。');
    const response = await chrome.runtime.sendMessage({ type: 'daymark' });
    if (ticket !== revision) return;
    if (response.error) throw new Error(response.error);
    daymarkData = response.data; $('focus-state').textContent = '已连接'; renderFocus();
  } catch (error) {
    if (ticket !== revision) return;
    $('focus-state').textContent = '未连接'; $('focus-title').textContent = '暂时无法读取当前任务。';
    $('focus-next').textContent = error.message;
  }
}

let previewNews;
async function readNews() {
  const ticket = revision;
  $('news').hidden = !settings.showNews;
  if (!settings.showNews || document.hidden) return;
  try {
    let result;
    if (extension) {
      const response = await chrome.runtime.sendMessage({ type: 'news' });
      if (response.error) throw new Error(response.error);
      result = response.data;
    } else {
      if (previewNews?.retryAt > Date.now()) result = previewNews;
      else {
        const response = await fetch('https://aihot.news/api/v1/hot-topics', { signal: AbortSignal.timeout(12000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        result = { items: (await response.json()).items.slice(0, 3), checkedAt: Date.now(), retryAt: Date.now() + 300000 };
        previewNews = result;
      }
    }
    if (ticket !== revision) return;
    $('headlines').replaceChildren();
    for (const item of result.items || []) {
      let url; try { url = webUrl(item.links.aihot); } catch { continue; }
      const li = document.createElement('li'), a = document.createElement('a');
      a.textContent = item.title; a.title = item.title; a.href = url.href; li.append(a); $('headlines').append(li);
    }
    const checked = result.checkedAt ? clockParts(new Date(result.checkedAt)).time : '';
    $('news-state').textContent = checked ? `${result.error ? '缓存' : '更新于'} ${checked}` : '暂不可用';
    $('news-error').textContent = result.error || (result.items?.length ? '' : '当前暂无热点');
    $('news-help').hidden = !result.error;
  } catch {
    if (ticket !== revision) return;
    $('news-state').textContent = '暂不可用'; $('news-error').textContent = '热点暂时无法获取，可以点击 AIHOT 阅读。';
    $('news-help').hidden = false;
  }
}

function openSettings() {
  document.querySelectorAll('input[name="theme"]').forEach(input => { input.checked = input.value === settings.theme; });
  $('engine').value = settings.engine; $('daymark-url').value = settings.daymarkUrl;
  $('pomodoro-minutes').value = settings.pomodoroMinutes;
  $('demo').checked = settings.demo; $('show-news').checked = settings.showNews;
  $('links').value = settings.links.map(link => `${link.name} | ${link.url}`).join('\n');
  $('settings-error').textContent = ''; $('settings').showModal();
}
$('settings-open').addEventListener('click', openSettings);
$('settings-close').addEventListener('click', () => $('settings').close());
$('settings-form').addEventListener('change', event => {
  if (event.target.name !== 'theme') return;
  const theme = event.target.value;
  settings.theme = theme;
  applyTheme(theme, true, true);
  themeSave = themeSave.then(async () => {
    if (extension) await chrome.storage.local.set({ theme });
  }).catch(() => { $('settings-error').textContent = '配色暂时无法保存，请重新选择后重试。'; });
});
$('settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const url = $('daymark-url').value.trim();
    const origin = url ? daymarkOrigin(url) : '';
    const links = $('links').value.split('\n').filter(line => line.trim()).map(line => {
      const divider = line.indexOf('|');
      if (divider < 1) throw new Error('网址格式：名称 | https://example.com');
      const name = line.slice(0, divider).trim();
      if (!name || name.length > 24) throw new Error('网址名称请保持在 1–24 字。');
      return { name, url: webUrl(line.slice(divider + 1).trim()).href };
    });
    if (links.length > 8) throw new Error('最多保留 8 个常用网址。');
    const demo = $('demo').checked;
    const pomodoroMinutes = parseDuration($('pomodoro-minutes').value);
    if (extension && origin && !demo) {
      const parsed = new URL(origin);
      const granted = await chrome.permissions.request({ origins: [`${parsed.protocol}//${parsed.hostname}/*`] });
      if (!granted) throw new Error('未获得 DayMark 站点访问权限，设置尚未保存。');
    }
    const next = { theme: document.querySelector('input[name="theme"]:checked').value, engine: $('engine').value, pomodoroMinutes, daymarkUrl: origin, links, demo, showNews: $('show-news').checked };
    if (extension) { await themeSave; await chrome.storage.local.set({ settings: next, theme: next.theme }); }
    else localStorage.setItem('daymark-start-settings', JSON.stringify(next));
    settings = next; revision++; applyTheme(settings.theme, true); $('settings').close(); renderLinks();
    await Promise.all([readDaymark(), readNews()]);
  } catch (error) { $('settings-error').textContent = error.message; }
});
$('search').addEventListener('submit', event => {
  event.preventDefault();
  try { const target = searchTarget($('query').value, settings.engine); if (target) location.assign(target); }
  catch (error) { $('query').setCustomValidity(error.message); $('query').reportValidity(); }
});
$('query').addEventListener('input', () => $('query').setCustomValidity(''));
document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !$('settings').open && !$('pomodoro').open) { event.preventDefault(); $('query').focus(); }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) { updateClock(); readDaymark(); readNews(); } });
async function initialize() {
  try {
    const stored = extension ? await chrome.storage.local.get(['settings', 'theme']) : { settings: JSON.parse(localStorage.getItem('daymark-start-settings')), theme: localStorage.getItem('daymark-start-theme') };
    settings = { ...defaults, ...stored.settings, theme: stored.theme || stored.settings?.theme || defaults.theme };
  } catch { settings = { ...defaults }; }
  if (!themes.includes(settings.theme)) settings.theme = defaults.theme;
  try { settings.pomodoroMinutes = parseDuration(settings.pomodoroMinutes); }
  catch { settings.pomodoroMinutes = defaults.pomodoroMinutes; }
  applyTheme(settings.theme, true);
  if (!extension && new URLSearchParams(location.search).has('demo')) settings.demo = true;
  renderLinks(); updateClock(); setupPomodoro(() => settings.pomodoroMinutes);
  await Promise.all([readDaymark(), readNews()]);
  setInterval(updateClock, 1000);
  setInterval(() => { if (!document.hidden) readDaymark(); }, 60000);
  setInterval(readNews, 300000);
}
initialize();
