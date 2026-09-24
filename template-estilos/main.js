// Loads the video spec + its style and boots the engine.  ?style=<id> and ?spec=<file> override (used by the catalog).
import { boot } from './engine/core.js';
const q = new URLSearchParams(location.search);
const spec = (await import('./' + (q.get('spec') || 'video.js'))).default;
if (q.get('style')) spec.style = q.get('style');
if (q.get('format')) spec.format = q.get('format');
const ids = [...new Set([spec.style, ...spec.scenes.map(s => s.style).filter(Boolean)])];
const mods = {}; for (const id of ids) mods[id] = (await import(`./styles/${id}.js`)).default;
await boot(spec, mods);
