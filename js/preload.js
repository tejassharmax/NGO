// Runs before the loader is drawn: on a reload in the same tab, skip the cold-boot
// loader. Kept as a file (not inline) so the Content-Security-Policy can block
// every inline script.
if (sessionStorage.getItem('chm_session_booted')) {
  document.write('<style>#initial-loader { display: none !important; }</style>');
}
