export function webUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('请输入不含账号密码的 HTTP 或 HTTPS 网址。');
  }
  return url;
}

export function daymarkOrigin(value) {
  const url = webUrl(value);
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('远程 DayMark 请使用 HTTPS；HTTP 仅用于本机。');
  }
  if (url.pathname !== '/' || url.search || url.hash) throw new Error('DayMark 地址请只填站点根地址。');
  return url.origin;
}

export function searchTarget(value, engine) {
  const text = value.trim();
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return webUrl(text).href;
  if (/^(localhost(?::\d+)?|(?:[a-z0-9-]+\.)+[a-z]{2,})(?::\d+)?(?:[/?#]\S*)?$/i.test(text)) {
    return webUrl(`${text.startsWith('localhost') ? 'http' : 'https'}://${text}`).href;
  }
  const bases = { bing: 'https://www.bing.com/search?q=', google: 'https://www.google.com/search?q=', baidu: 'https://www.baidu.com/s?wd=' };
  return (bases[engine] || bases.bing) + encodeURIComponent(text);
}

export function clockParts(now, timezone = 'Asia/Shanghai') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}`, minutes: Number(values.hour) * 60 + Number(values.minute) };
}

const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
export function selectFocus(tasks, now = new Date(), timezone = 'Asia/Shanghai') {
  const clock = clockParts(now, timezone);
  const available = tasks.filter(t => t.date === clock.date && !t.blocked && !['completed', 'cancelled'].includes(t.status));
  const byPriority = (a, b) => (a.priority ?? 2) - (b.priority ?? 2) || (a.start_time || '99:99').localeCompare(b.start_time || '99:99');
  const current = available.filter(t => t.start_time && minutes(t.start_time) <= clock.minutes && clock.minutes < (t.end_time ? minutes(t.end_time) : minutes(t.start_time) + Math.max(15, t.estimated_duration ?? 30))).sort(byPriority);
  const upcoming = available.filter(t => t.start_time && minutes(t.start_time) > clock.minutes).sort((a, b) => a.start_time.localeCompare(b.start_time) || byPriority(a, b));
  const untimed = available.filter(t => !t.start_time).sort(byPriority);
  const missed = available.filter(t => t.start_time && !current.includes(t) && !upcoming.includes(t)).sort(byPriority);
  const task = current[0] || upcoming[0] || untimed[0] || missed[0] || null;
  return { task, next: upcoming.find(t => t !== task) || null, label: current.length ? '现在' : upcoming.length ? '接下来' : untimed.length ? '今日待办' : '待处理' };
}
