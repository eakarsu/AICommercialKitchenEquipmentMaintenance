const https = require('https');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function queryAI(systemPrompt, userPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    return {
      success: false,
      response: 'OpenRouter API key not configured. Please add your API key to the .env file.',
      model: model,
      usage: null
    };
  }

  const payload = JSON.stringify({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 2000,
    temperature: 0.7
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Kitchen Equipment Maintenance'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            resolve({
              success: false,
              response: parsed.error.message || 'AI service error',
              model: model,
              usage: null
            });
          } else {
            resolve({
              success: true,
              response: parsed.choices?.[0]?.message?.content || 'No response generated',
              model: parsed.model || model,
              usage: parsed.usage || null,
              id: parsed.id
            });
          }
        } catch (e) {
          resolve({
            success: false,
            response: 'Failed to parse AI response',
            model: model,
            usage: null
          });
        }
      });
    });

    req.on('error', (e) => {
      resolve({
        success: false,
        response: `AI service connection error: ${e.message}`,
        model: model,
        usage: null
      });
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { queryAI };
