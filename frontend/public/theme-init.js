// Resolve the theme before first paint to avoid a light/dark flash (see ThemeContext).
// Kept as a file (not inline) so the Content-Security-Policy can forbid inline scripts.
;(function () {
  var t = null
  try {
    t = localStorage.getItem('hobbook_theme')
  } catch (e) {}
  if (t !== 'light' && t !== 'dark') {
    t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  document.documentElement.dataset.theme = t
  if (t === 'dark') document.querySelector('meta[name="theme-color"]').setAttribute('content', '#111a27')
})()
