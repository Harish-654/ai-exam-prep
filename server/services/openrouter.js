const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function requireKey() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set in environment. Add it to the .env file.');
  }
  return apiKey;
}

async function requestCompletion(apiKey, body) {
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

    const message = data && data.choices && data.choices[0] && data.choices[0].message;
    if (!message) {
      lastError = new Error('OpenRouter returned an empty response');
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * attempt);
        continue;
      }
      throw lastError;
    }

    return message;
  }

  throw lastError || new Error('OpenRouter request failed after multiple attempts');
}

async function callOpenRouter(systemPrompt, userContent, jsonMode = false) {
  const apiKey = requireKey();
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

  const message = await requestCompletion(apiKey, body);
  const content = message.content;
  if (!content || !content.trim()) {
    throw new Error('OpenRouter returned an empty response');
  }
  return content.trim();
}

// Real tool-calling loop: sends tool definitions, executes any tool_calls via
// runTool, feeds results back, and repeats until the model returns final content.
async function callOpenRouterWithTools(systemPrompt, userContent, tools, runTool, options = {}) {
  const apiKey = requireKey();
  const maxSteps = options.maxSteps || 4;
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  for (let step = 0; step < maxSteps; step += 1) {
    const message = await requestCompletion(apiKey, {
      model: MODEL,
      messages,
      tools,
      tool_choice: 'auto',
    });

    const toolCalls = message.tool_calls;
    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      messages.push({ role: 'assistant', content: message.content || null, tool_calls: toolCalls });
      for (const call of toolCalls) {
        let result;
        try {
          const args = call.function && call.function.arguments ? JSON.parse(call.function.arguments) : {};
          result = runTool ? await runTool(call.function.name, args) : { error: 'No tool runner configured' };
        } catch (error) {
          result = { error: String((error && error.message) || error) };
        }
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    const content = message.content;
    if (!content || !content.trim()) {
      throw new Error('OpenRouter returned an empty response');
    }
    return content.trim();
  }

  throw new Error('Tool loop exceeded ' + maxSteps + ' steps without a final answer');
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

module.exports = { callOpenRouter, callOpenRouterWithTools, extractJsonContent };
