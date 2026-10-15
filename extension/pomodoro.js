import { createCountdown, remainingMs, pauseCountdown, resumeCountdown, restoreCountdown } from './pomodoro-state.js';

export function setupPomodoro(getMinutes) {
  const panel = document.getElementById('pomodoro');
  const clock = document.getElementById('flip-clock');
  const entry = document.getElementById('pomodoro-open');
  const toggle = document.getElementById('pomodoro-toggle');
  const status = document.getElementById('pomodoro-status');
  const digits = [...clock.querySelectorAll('.flip-digit')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'daymark-start-countdown';
  let state = null, interval, hideControls, ownsFullscreen = false, previous = '';
  try { state = restoreCountdown(JSON.parse(sessionStorage.getItem(storageKey))); }
  catch { /* The timer also works when session storage is unavailable. */ }

  function remember() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(state)); }
    catch { /* Keep the current countdown in memory. */ }
  }

  function showControls() {
    panel.dataset.controls = 'visible';
    clearTimeout(hideControls);
    hideControls = setTimeout(() => { panel.dataset.controls = 'hidden'; }, 2200);
  }

  function render() {
    const seconds = Math.ceil(remainingMs(state) / 1000);
    const minutes = Math.floor(seconds / 60);
    const time = `${String(minutes).padStart(2, '0')}${String(seconds % 60).padStart(2, '0')}`;
    for (let index = 0; index < digits.length; index++) {
      if (time[index] === previous[index]) continue;
      const digit = digits[index];
      const animate = previous && !document.hidden && !reducedMotion.matches;
      const oldValue = animate ? previous[index] : time[index];
      const faces = ['flip-top', 'flip-bottom', 'flip-leaf flip-leaf-front', 'flip-leaf flip-leaf-back'].map((name, face) => {
        const half = document.createElement('span'), number = document.createElement('span');
        half.className = name;
        number.textContent = face === 1 || face === 2 ? oldValue : time[index];
        half.append(number); return half;
      });
      digit.replaceChildren(...faces);
      digit.classList.toggle('flipping', !!animate);
      faces[3].addEventListener('animationend', () => {
        faces[1].firstChild.textContent = time[index];
        digit.classList.remove('flipping');
      }, { once: true });
    }
    previous = time;
    clock.setAttribute('aria-label', `剩余${minutes}分${seconds % 60}秒`);
    document.title = `${time.slice(0, 2)}:${time.slice(2)} · 专注`;
    if (seconds === 0 && state.deadline !== null) {
      state = pauseCountdown(state); remember(); clearInterval(interval);
      status.textContent = '本次专注已完成。'; showControls();
    }
    const action = seconds === 0 ? '重新开始' : state.deadline === null ? '继续' : '暂停';
    toggle.setAttribute('aria-label', action); toggle.title = `${action}（空格）`;
    const paths = seconds === 0 ? '<path d="M4 11a8 8 0 1 1 2 6M4 4v7h7"/>' : state.deadline === null ? '<path d="m9 5 10 7-10 7V5Z"/>' : '<path d="M9 5v14M15 5v14"/>';
    if (toggle.dataset.action !== action) {
      toggle.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
      toggle.dataset.action = action;
    }
  }

  function startTicking() {
    clearInterval(interval); render();
    if (state.deadline !== null) interval = setInterval(render, 200);
  }

  function enter(requestFullscreen = true, restoring = false) {
    if (panel.open) return;
    if (!restoring) {
      if (!state || state.minutes !== getMinutes() || remainingMs(state) === 0) state = createCountdown(getMinutes());
      else state = resumeCountdown(state);
    }
    remember(); previous = ''; status.textContent = '';
    panel.showModal(); clock.focus({ preventScroll: true });
    document.body.classList.add('timing'); showControls(); startTicking();
    // A browser may deny fullscreen (for example in an embedded preview); the page still fills the viewport.
    if (requestFullscreen && !document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => {
        ownsFullscreen = true;
        if (!panel.open) { ownsFullscreen = false; document.exitFullscreen().catch(() => {}); }
      }).catch(() => {});
    }
  }

  function changeRunning() {
    if (remainingMs(state) === 0) { state = createCountdown(getMinutes()); status.textContent = ''; }
    else state = state.deadline === null ? resumeCountdown(state) : pauseCountdown(state);
    remember(); showControls(); startTicking();
  }

  entry.addEventListener('click', () => enter());
  toggle.addEventListener('click', changeRunning);
  document.getElementById('pomodoro-close').addEventListener('click', () => panel.close());
  panel.addEventListener('pointermove', showControls);
  panel.addEventListener('pointerdown', showControls);
  panel.addEventListener('focusin', showControls);
  panel.addEventListener('keydown', event => {
    showControls();
    if (event.code === 'Space') {
      event.preventDefault(); if (!event.repeat) changeRunning();
    }
  });
  panel.addEventListener('close', () => {
    state = pauseCountdown(state); remember();
    clearInterval(interval); clearTimeout(hideControls); previous = '';
    document.body.classList.remove('timing'); document.title = 'Daymark Start';
    if (ownsFullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    ownsFullscreen = false; entry.focus({ preventScroll: true });
  });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && ownsFullscreen) { ownsFullscreen = false; if (panel.open) panel.close(); }
  });
  document.addEventListener('visibilitychange', () => { if (panel.open) render(); });
  reducedMotion.addEventListener('change', () => { if (panel.open) { previous = ''; render(); } });
  if (state && state.deadline !== null) enter(false, true);
}
