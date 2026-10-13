// Apply the saved palette before the page paints; full settings load in app.js.
try {
  const theme = localStorage.getItem('daymark-start-theme');
  if (theme) document.documentElement.dataset.theme = theme;
} catch { /* Storage may be unavailable; CSS supplies the default palette. */ }
