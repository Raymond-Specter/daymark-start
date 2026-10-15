export function parseDuration(value) {
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 99) throw new Error('番茄钟时长请输入 1–99 的整数分钟。');
  return minutes;
}

export function createCountdown(minutes, now = Date.now()) {
  const duration = parseDuration(minutes);
  return { minutes: duration, remaining: duration * 60000, deadline: now + duration * 60000 };
}

export function remainingMs(state, now = Date.now()) {
  return Math.max(0, Math.min(state.remaining, state.deadline === null ? state.remaining : state.deadline - now));
}

export function pauseCountdown(state, now = Date.now()) {
  return { ...state, remaining: remainingMs(state, now), deadline: null };
}

export function resumeCountdown(state, now = Date.now()) {
  return state.deadline === null ? { ...state, deadline: now + state.remaining } : state;
}

export function restoreCountdown(value) {
  if (!value || !Number.isInteger(value.minutes) || value.minutes < 1 || value.minutes > 99 ||
      !Number.isFinite(value.remaining) || value.remaining < 0 || value.remaining > value.minutes * 60000 ||
      (value.deadline !== null && (!Number.isFinite(value.deadline) || value.deadline < 0))) return null;
  return { minutes: value.minutes, remaining: value.remaining, deadline: value.deadline };
}
