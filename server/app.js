require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const { convertDocumentToMarkdown } = require('./services/markitdown');
const { callOpenRouter, callOpenRouterWithTools, extractJsonContent } = require('./services/openrouter');
const { generateCalendarPayload } = require('./services/calendar');
const { toolDefinitions, runTool } = require('./services/tools');
const memory = require('./services/memory');

const app = express();
const PORT = process.env.PORT || 5000;

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
  app.use(express.static(CLIENT_DIST));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    return res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res
      .status(503)
      .send('Client not built. Run `npm run build --prefix client`, or use the Vite dev server with `npm run dev:client`.');
  });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const activeClients = new Set();
setInterval(() => {
  for (const client of activeClients) client.write(': heartbeat\n\n');
}, 25000);

function emitLog(type, message) {
  const payload = JSON.stringify({ type, message });
  for (const client of activeClients) {
    client.write(`data: ${payload}\n\n`);
  }
}

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('retry: 3000\n\n');
  activeClients.add(res);
  req.on('close', () => activeClients.delete(res));
});

async function runPlanner(markdown, userPrompt) {
  const systemPrompt =
    'You are the Planning Agent in a multi-agent exam preparation system. ' +
    'You analyze an exam preparation document and produce a concrete study plan. ' +
    'You speak the truth derived strictly from the provided source text. ' +
    'You have real tools available: get_past_plans (recall summaries of earlier study ' +
    'plans so this one stays consistent) and compute_study_schedule (compute real dates ' +
    'for study sessions). Call them when useful, then respond with ONLY a valid JSON ' +
    'object and nothing else.';

  let userPromptText =
    'Analyze the exam preparation material below and build a study plan.\n\n';

  if (userPrompt && userPrompt.trim()) {
    userPromptText +=
      'The student gave you the following instructions. Follow them closely when ' +
      'building the plan (prioritize requested topics, skip requested exclusions, ' +
      'adjust depth and hours accordingly):\n' +
      userPrompt.trim() +
      '\n\n';
  }

  userPromptText +=
    'Return a JSON object with this exact shape:\n' +
    '{\n' +
    '  "totalHours": <number, estimated total prep hours>,\n' +
    '  "modules": [\n' +
    '    { "title": <string>, "duration": <string like "2 hours">, "topics": [<string>, ...] }\n' +
    '  ]\n' +
    '}\n\n' +
    'Constraints: estimate between 8 and 60 total hours based on content volume, difficulty, and the student instructions; ' +
    'build between 3 and 8 modules; each module must have 2-6 concrete topics extracted from the source.\n\n' +
    'SOURCE MATERIAL (page markers indicate which page each passage came from):\n' +
    '---\n' +
    markdown.slice(0, 30000) +
    '\n---';

  let raw;
  try {
    raw = await callOpenRouterWithTools(systemPrompt, userPromptText, toolDefinitions, runTool);
  } catch (error) {
    emitLog('warn', 'Tool calling unavailable (' + error.message + '). Falling back to standard Planner call.');
    raw = await callOpenRouter(systemPrompt, userPromptText, true);
  }
  return extractJsonContent(raw);
}

app.post('/api/generate-exam-prep', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No document file was uploaded.' });
  }

  const originalName = req.file.originalname;
  const filePath = req.file.path;

  const pagesRaw = typeof req.body.pages === 'string' ? req.body.pages.trim() : '';
  const pages = pagesRaw && /^[\d,\s-]+$/.test(pagesRaw) && pagesRaw.length <= 100 ? pagesRaw : '';
  const userPrompt = typeof req.body.prompt === 'string' ? req.body.prompt.trim().slice(0, 2000) : '';
  let markdown = '';

  try {
    emitLog('info', 'Pipeline started. Received ' + originalName + '.');

    if (pages) {
      emitLog('info', 'Page selection requested: pages ' + pages + '.');
    }
    if (userPrompt) {
      emitLog('info', 'Student guidance applied: "' + (userPrompt.length > 160 ? userPrompt.slice(0, 160) + '…' : userPrompt) + '".');
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
    emitLog('info', '[1/3] Parsing document (text extraction, page selection, OCR)...');
    markdown = await convertDocumentToMarkdown(filePath, {
      pages: pages || undefined,
      onProgress: (message) => emitLog('info', message),
    });
    emitLog('success', 'Document converted to Markdown (' + markdown.length + ' chars).');

    emitLog('info', '[2/3] Planner Agent analyzing context and estimating prep hours...');
    const syllabusRaw = await runPlanner(markdown, userPrompt);
    const syllabus = {
      totalHours: Number(syllabusRaw && syllabusRaw.totalHours) || 0,
      modules: Array.isArray(syllabusRaw && syllabusRaw.modules) ? syllabusRaw.modules : [],
    };
    if (syllabus.modules.length === 0) {
      throw new Error('Planner Agent returned an invalid syllabus.');
    }
    emitLog('success', 'Planner drafted ' + syllabus.modules.length + ' study module(s), ' + syllabus.totalHours + 'h total.');

    memory.remember({
      fileName: originalName,
      totalHours: syllabus.totalHours,
      modules: syllabus.modules.map((module) => ({ title: module.title })),
      timestamp: new Date().toISOString(),
    });
    emitLog('info', 'Plan saved to long-term memory for future sessions.');

    emitLog('info', '[3/3] Finalizing calendar payload and response...');
    const calendar = generateCalendarPayload(syllabus);

    emitLog('success', 'Pipeline complete. Rendering workspace...');

    return res.json({
      success: true,
      fileName: originalName,
      markdown,
      syllabus,
      calendar,
    });
  } catch (error) {
    emitLog('error', 'Pipeline failed: ' + error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unexpected server error during the agentic pipeline.',
    });
  } finally {
    fs.promises.rm(filePath, { force: true }).catch(() => {});
  }
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled server error:', err);
  const message = err && err.message ? err.message : 'Unexpected server error';
  if (res.headersSent) return;
  return res.status(500).json({ success: false, error: message });
});

app.listen(PORT, () => {
  console.log('ExamPrep Agent running on http://localhost:' + PORT);
});