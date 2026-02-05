#!/usr/bin/env node
/**
 * Build docs index and contents for Vercel deployment.
 * Run this before deploying: node scripts/build-docs.js
 * Generates api/docs-index.json and api/docs-contents.json
 */
const fs = require('fs');
const path = require('path');

const CLAWD_DIR = process.env.CLAWD_DIR || '/Users/stanley/clawd';
const SESSIONS_DIR = path.join(require('os').homedir(), '.clawdbot/agents/main/sessions');
const OUT_DIR = path.join(__dirname, '..', 'api');

const TAG_MAP = {
  'memory/daily': { tag: 'Journal', color: '#3fb950' },
  'memory/people': { tag: 'People', color: '#58a6ff' },
  'memory/projects': { tag: 'Projects', color: '#a371f7' },
  'memory/learnings': { tag: 'Learnings', color: '#f0883e' },
  'memory/conversations': { tag: 'Conversations', color: '#39d5e6' },
  'memory/preferences': { tag: 'Preferences', color: '#d2a8ff' },
  'agents/kaizen': { tag: 'Kaizen', color: '#d29922' },
};

function getTag(relPath) {
  for (const [prefix, info] of Object.entries(TAG_MAP)) {
    if (relPath.startsWith(prefix + '/')) return info;
  }
  if (!relPath.includes('/')) return { tag: 'Core', color: '#f85149' };
  if (relPath.startsWith('memory/') && relPath.split('/').length === 2) return { tag: 'Memory', color: '#d2a8ff' };
  return { tag: 'Other', color: '#8b949e' };
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function scanDir(dir, relBase) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(relBase, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'backups'].includes(entry.name))
        results.push(...scanDir(fullPath, relPath));
    } else if (entry.name.endsWith('.md')) {
      try {
        const stat = fs.statSync(fullPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const words = content.split(/\s+/).filter(w => w.length > 0).length;
        const tagInfo = getTag(relPath);
        results.push({
          name: entry.name, path: relPath, size: stat.size,
          sizeHuman: stat.size < 1024 ? `${stat.size}B` : `${(stat.size/1024).toFixed(1)}KB`,
          modified: stat.mtime.toISOString(), age: timeAgo(stat.mtime),
          words, tag: tagInfo.tag, tagColor: tagInfo.color, type: '.md',
          _content: content,
        });
      } catch (e) {}
    }
  }
  return results;
}

console.log('Building docs index...');
const files = [];
const contents = {};

// Root .md files
for (const name of ['AGENTS.md','MEMORY.md','SOUL.md','USER.md','TOOLS.md','IDENTITY.md','HEARTBEAT.md',
                     'AI_KNOWLEDGE_BASE.md','GETTING_TO_KNOW_YOU.md','LEARNING_PLAN.md']) {
  const fp = path.join(CLAWD_DIR, name);
  if (fs.existsSync(fp)) {
    const stat = fs.statSync(fp);
    const content = fs.readFileSync(fp, 'utf-8');
    const words = content.split(/\s+/).filter(w => w.length > 0).length;
    files.push({
      name, path: name, size: stat.size,
      sizeHuman: `${(stat.size/1024).toFixed(1)}KB`,
      modified: stat.mtime.toISOString(), age: timeAgo(stat.mtime),
      words, tag: 'Core', tagColor: '#f85149', type: '.md',
    });
    contents[name] = content;
  }
}

// Memory + kaizen
for (const scanned of [...scanDir(path.join(CLAWD_DIR, 'memory'), 'memory'), ...scanDir(path.join(CLAWD_DIR, 'agents/kaizen'), 'agents/kaizen')]) {
  contents[scanned.path] = scanned._content;
  delete scanned._content;
  files.push(scanned);
}

// Sort by modified desc
files.sort((a, b) => new Date(b.modified) - new Date(a.modified));

fs.writeFileSync(path.join(OUT_DIR, 'docs-index.json'), JSON.stringify(files, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'docs-contents.json'), JSON.stringify(contents));

console.log(`Built index: ${files.length} files, ${Object.keys(contents).length} contents`);
console.log(`Output: api/docs-index.json (${(fs.statSync(path.join(OUT_DIR, 'docs-index.json')).size/1024).toFixed(1)}KB)`);
console.log(`Output: api/docs-contents.json (${(fs.statSync(path.join(OUT_DIR, 'docs-contents.json')).size/1024).toFixed(1)}KB)`);
