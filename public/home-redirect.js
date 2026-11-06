// Staff who are already signed in go straight to the app. A file, not an inline
// script, so the Content-Security-Policy can block every inline script.
try { if (localStorage.getItem('sample-logged-in') === 'true') location.replace('/app' + location.hash); } catch (e) {}
