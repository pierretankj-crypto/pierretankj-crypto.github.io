// Prints tools/resume/resume.html to public/Pierre_Tan_Resume.pdf with headless Microsoft Edge
// (or Chrome), then checks it is still one page.
// Usage: node tools/resume/build.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];
const browser = BROWSERS.find(existsSync);
if (!browser) throw new Error('Edge or Chrome is needed to print the résumé.');

const src = resolve('tools/resume/resume.html');
const out = resolve('public/Pierre_Tan_Resume.pdf');
const profile = resolve('tools/resume/.browser-profile');

execFileSync(browser, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${profile}`, '--no-pdf-header-footer', '--run-all-compositor-stages-before-draw',
  '--virtual-time-budget=4000', `--print-to-pdf=${out}`, pathToFileURL(src).href,
], { stdio: 'inherit', timeout: 60000 });

const pdf = readFileSync(out, 'latin1');
const pages = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log(`wrote ${out} (${Math.round(pdf.length / 1024)} KB, ${pages} page${pages === 1 ? '' : 's'})`);
if (pages !== 1) { console.error('The résumé no longer fits on one page.'); process.exitCode = 1; }
