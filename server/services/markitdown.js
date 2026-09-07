const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const PYTHON_BIN = process.platform === 'win32'
  ? path.join(__dirname, '..', '..', 'python', 'venv', 'Scripts', 'python.exe')
  : path.join(__dirname, '..', '..', 'python', 'venv', 'bin', 'python');

const CONVERT_SCRIPT = path.join(__dirname, '..', '..', 'python', 'convert.py');

const PROGRESS_PREFIX = '[convert] ';

function convertDocumentToMarkdown(filePath, options = {}) {
  const { pages, onProgress } = options;
  return new Promise((resolve, reject) => {
    if (!filePath || !fs.existsSync(filePath)) {
      reject(new Error('Source file does not exist: ' + filePath));
      return;
    }
    if (!fs.existsSync(PYTHON_BIN)) {
      reject(new Error('Python virtualenv not found at: ' + PYTHON_BIN + '. Run python3 -m venv python/venv && python/venv/bin/pip install -r python/requirements.txt'));
      return;
    }

    const args = [CONVERT_SCRIPT, filePath];
    if (pages && String(pages).trim()) {
      args.push('--pages', String(pages).trim());
    }

    const child = spawn(PYTHON_BIN, args, { maxBuffer: 50 * 1024 * 1024 });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (typeof onProgress === 'function') {
        for (const line of text.split('\n')) {
          if (line.startsWith(PROGRESS_PREFIX)) {
            onProgress(line.slice(PROGRESS_PREFIX.length));
          }
        }
      }
    });

    child.on('error', (error) => {
      reject(new Error('Document conversion failed: ' + error.message));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        const detail = (stderr || '').trim() || 'converter exited with code ' + code;
        reject(new Error('Document conversion failed: ' + detail));
        return;
      }
      resolve(stdout);
    });
  });
}

module.exports = { convertDocumentToMarkdown };