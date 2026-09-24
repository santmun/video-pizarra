// Deterministic frame-by-frame renderer: seeks the GSAP timeline, screenshots the SVG, pipes JPEGs to ffmpeg.
//   node render.mjs out.mp4 [--fps 30] [--mode A]      full video (no audio)
//   node render.mjs --every 1.5                         QA stills every 1.5 s → stills/
//   node render.mjs --stills 3.2,10,24.5                QA stills at given seconds → stills/
// Also writes sfx.json (sound events) and hits.json (transition hits) for the audio mix.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = args[0] && !args[0].startsWith('--') ? args[0] : null;
const fps = Number(opt('--fps', 30)), mode = opt('--mode', 'A');
const root = process.cwd();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = createServer(async (req, res) => {
  try { const p = join(root, decodeURIComponent(req.url.split('?')[0])); res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(await readFile(p)); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const launch = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {};
const browser = await chromium.launch(launch);
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('PAGE ERROR', e.message));
await page.goto(`http://localhost:${server.address().port}/index.html?render=1&mode=${mode}`);
await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
const [vw, vh] = await page.evaluate(() => [window.VW, window.VH]);
await page.setViewportSize({ width: vw, height: vh });
const svg = await page.$('#stage');
const duration = await page.evaluate(() => window.DURATION);
await writeFile('sfx.json', JSON.stringify(await page.evaluate(() => window.SFX || [])));
await writeFile('hits.json', JSON.stringify(await page.evaluate(() => window.HITS || [])));

let stills = opt('--stills') ? opt('--stills').split(',').map(Number) : null;
if (opt('--every')) { stills = []; for (let x = 0.3; x < duration; x += Number(opt('--every'))) stills.push(+x.toFixed(2)); }
if (stills) {
  await mkdir('stills', { recursive: true });
  for (const t of stills) {
    await page.evaluate(t => window.renderAt(t), t);
    await writeFile(`stills/s_${t.toFixed(2).padStart(6, '0')}.jpg`, await svg.screenshot({ type: 'jpeg', quality: 85 }));
  }
  console.log(`stills done (${stills.length}), duration ${duration.toFixed(2)}s`);
} else {
  const file = out || 'video.mp4';
  const frames = Math.ceil(duration * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    await page.evaluate(t => window.renderAt(t), f / fps);
    const buf = await svg.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 300 === 0) console.log(`frame ${f}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log('done', file, duration.toFixed(2) + 's');
}
await browser.close(); server.close();
