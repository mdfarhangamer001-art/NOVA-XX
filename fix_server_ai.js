const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server.ts');
let content = fs.readFileSync(file, 'utf8');

const replacement = `
    } else if (channel === 'secure-get-keys') {
      result = {
        geminiKey: process.env.GEMINI_API_KEY || global.mockKeys.geminiKey || '',
        groqKey: process.env.GROQ_API_KEY || global.mockKeys.groqKey || '',
        hfKey: process.env.HF_API_KEY || global.mockKeys.hfKey || '',
        tavilyKey: process.env.TAVILY_API_KEY || global.mockKeys.tavilyKey || '',
        openrouterKey: process.env.OPENROUTER_API_KEY || global.mockKeys.openrouterKey || ''
      };
    } else if (channel === 'google-sign-in') {
      result = { success: true, name: 'Operator', email: 'operator@example.com', token: 'mock-token', syncTime: new Date().toLocaleTimeString(), avatar: '' };
    } else if (channel === 'iris-transcribe-audio') {
      try {
         const { base64Audio, mimeType } = args[0];
         const apiKey = process.env.GEMINI_API_KEY || global.mockKeys.geminiKey;
         if (!apiKey) throw new Error('Gemini API key is required');
         const { GoogleGenAI } = require('@google/genai');
         const ai = new GoogleGenAI({ apiKey });
         const response = await ai.models.generateContent({
           model: 'gemini-2.0-flash',
           contents: [{
             role: 'user',
             parts: [
               { text: 'Precisely transcribe the spoken audio. Respond with ONLY the transcribed text. Do not add quotes or commentary.' },
               { inlineData: { mimeType: mimeType.split(';')[0], data: base64Audio } }
             ]
           }]
         });
         result = response.text;
      } catch (err) {
         console.error('[Web Preview] Transcribe Error:', err);
         result = '';
      }
    } else if (channel === 'agent-run-task') {
      try {
         const apiKey = process.env.GEMINI_API_KEY || global.mockKeys.geminiKey;
         if (!apiKey) throw new Error('Gemini API key is required');
         const { GoogleGenAI } = require('@google/genai');
         const ai = new GoogleGenAI({ apiKey });
         const query = args[0];
         const response = await ai.models.generateContent({
           model: 'gemini-2.0-flash',
           contents: 'You are NOVA-X, an advanced professional AI assistant. The user said: ' + query
         });
         result = response.text;
      } catch (err) {
         console.error('[Web Preview] Agent Error:', err);
         result = 'Sorry, there was an error processing your request: ' + err.message;
      }
    }
`;

content = content.replace(/} else if \(channel === 'secure-get-keys'\) \{[\s\S]*?\} else if \(channel === 'google-sign-in'\) \{[\s\S]*?\}\n/, replacement + '\n');
// Since I used async await inside app.post, need to make it async.
content = content.replace(`app.post('/api/ipc', (req, res) => {`, `app.post('/api/ipc', async (req, res) => {`);

fs.writeFileSync(file, content, 'utf8');
