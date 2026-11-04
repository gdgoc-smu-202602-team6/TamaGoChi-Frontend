const port = process.argv[2] ?? '8081';
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  console.error('Usage: npm run check:web-dev -- <local Metro port>');
  process.exit(1);
}

const origin = `http://localhost:${port}`;
const routes = ['/login', '/signup', '/account', '/', '/shop', '/notice', '/mypage', '/study', '/room-edit', '/app-blocking'];

(async () => {
  const status = await fetch(`${origin}/status`, { signal: AbortSignal.timeout(10000) });
  if (!status.ok || (await status.text()).trim() !== 'packager-status:running') throw new Error('Start the Metro development server before running this check.');
  let failures = 0;
  for (let pass = 1; pass <= 2; pass++) {
    for (const route of routes) {
      const response = await fetch(`${origin}${route}`, { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(60000) });
      const html = await response.text();
      const valid = response.status === 200 && /<!DOCTYPE html>/i.test(html) && !html.includes('Requiring unknown module');
      if (!valid) failures++;
      console.log(`${valid ? 'PASS' : 'FAIL'} ${route} pass=${pass} status=${response.status}`);
    }
  }
  if (failures) throw new Error(`${failures} development SSR requests failed.`);
  console.log('20 development SSR requests passed. Browser hydration and Fast Refresh need a browser check.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
