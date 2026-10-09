const path = require('path');
const fs = require('fs');

const MEMORY_FILE = path.join(__dirname, '..', '..', 'memory', 'sessions.json');
const MAX_ENTRIES = 50;

function loadAll() {
  try {
    const raw = fs.readFileSync(MEMORY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadRecent(limit = 5) {
  const count = Math.min(Math.max(Number(limit) || 5, 1), 10);
  return loadAll().slice(-count).reverse();
}

function remember(entry) {
  try {
    fs.mkdirSync(path.dirname(MEMORY_FILE), { recursive: true });
    const next = [...loadAll(), entry].slice(-MAX_ENTRIES);
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(next, null, 2));
  } catch {
    // memory is best-effort; never break the pipeline over it
  }
}

function summarize(session) {
  return {
    fileName: session.fileName,
    totalHours: session.totalHours,
    modules: (session.modules || []).map((module) => module.title),
    timestamp: session.timestamp,
  };
}

module.exports = { loadRecent, remember, summarize };
