const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openrouter/free';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callOpenRouter(systemPrompt, userContent, jsonMode = false) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set in environment. Add it to the .env file.');
  }

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    let response;
    try {
      response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:5000',
          'X-Title': 'ExamPrep Agent',
        },
        body: JSON.stringify(body),
      });
    } catch (networkError) {
      lastError = networkError;
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * attempt);
        continue;
      }
      throw new Error('OpenRouter request failed: ' + networkError.message);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = (data && data.error && (data.error.message || data.error.code)) || `HTTP ${response.status}`;
      const isRateLimit = response.status === 429 || /rate.?limit/i.test(String(message));
      lastError = new Error('OpenRouter API error: ' + message);
      if (isRateLimit && attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * attempt);
        continue;
      }
      throw lastError;
    }

    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : null;

    if (!content || !content.trim()) {
      lastError = new Error('OpenRouter returned an empty response');
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * attempt);
        continue;
      }
      throw lastError;
    }

    return content.trim();
  }

  throw lastError || new Error('OpenRouter request failed after multiple attempts');
}

function extractJsonContent(content) {
  if (!content) return null;
  const text = content.trim();
  try {
    return JSON.parse(text);
  } catch (_) {
    // noop - fall through to regex extraction
  }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const objectStart = candidate.indexOf('{');
  const objectEnd = candidate.lastIndexOf('}');
  if (objectStart === -1 || objectEnd === -1 || objectEnd <= objectStart) return null;
  try {
    return JSON.parse(candidate.slice(objectStart, objectEnd + 1));
  } catch (_) {
    return null;
  }
}

module.exports = { callOpenRouter, extractJsonContent };