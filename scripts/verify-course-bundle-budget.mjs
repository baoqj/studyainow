import { strict as assert } from 'node:assert';
import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const assets = resolve(import.meta.dirname, '..', 'dist', 'assets');
const courseChunk = readdirSync(assets).find((name) => /^courseAnalytics-.*\.js$/.test(name));
assert.ok(courseChunk, 'expected the lazy course-content chunk after a production build');

const bytes = statSync(resolve(assets, courseChunk)).size;
const limit = 500_000;
assert.ok(bytes < limit, `course content route chunk is ${bytes} bytes; expected less than ${limit}`);

console.log(JSON.stringify({ chunk: courseChunk, bytes, limit, withinBudget: true }, null, 2));
