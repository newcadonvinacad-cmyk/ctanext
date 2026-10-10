import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// The concurrency suite requires a separate disposable PostgreSQL server and
// remains an explicit command; ordinary tests never use DATABASE_URL.
const files = fs.readdirSync('tests').filter(f => f.endsWith('.test.cjs') && f !== 'production-concurrency.test.cjs').sort();
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files.map(f => `tests/${f}`)], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
