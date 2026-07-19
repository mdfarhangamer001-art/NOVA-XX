import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // SSE endpoint
  app.get('/api/ipc-events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    const interval = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 15000);
    req.on('close', () => clearInterval(interval));
  });

  // Mock IPC invoke
  app.post('/api/ipc', async (req, res) => {
    const { channel, args } = req.body;
    let result = null;
    if (!global.mockKeys) global.mockKeys = {};

    if (channel === 'get-companion-status') {
      result = { connected: false, url: '', ip: '', pin: '' };
    } else if (channel === 'secure-save-keys') {
      global.mockKeys = { ...global.mockKeys, ...args[0] };
      result = { success: true };
    
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
         
         const execSync = require('child_process').execSync;
         const workspaceRoot = process.cwd();

         const runCommandDeclaration = {
           name: 'runCommand',
           description: 'Executes a shell command on the host machine. Can be used to create files, build apps, deploy websites, or change system settings.',
           parameters: {
             type: 'OBJECT',
             properties: {
               command: {
                 type: 'STRING',
                 description: 'The shell command to execute.'
               }
             },
             required: ['command']
           }
         };

         let contents = [
             { role: 'user', parts: [{ text: 'You are NOVA-X, an advanced autonomous AI desktop assistant. You have full system control. Fulfill the operator\'s request. If asked to create a website, use runCommand to create files (e.g. echo "code" > index.html) and deploy it if requested. If asked to change wallpaper, use runCommand with appropriate OS commands. Ensure you execute tasks for real, do not simulate.' }] },
             { role: 'user', parts: [{ text: query }] }
         ];

         const response = await ai.models.generateContent({
           model: 'gemini-2.0-flash',
           contents: contents,
           config: {
             tools: [{ functionDeclarations: [runCommandDeclaration] }]
           }
         });
         
         let finalResponse = response;
         // Handle tool calls
         if (response.functionCalls && response.functionCalls.length > 0) {
            const call = response.functionCalls[0];
            const cmdArgs = call.args;
            
            console.log('[Web Preview] Executing command:', cmdArgs.command);
            let resultOutput;
            try {
               const stdout = execSync(cmdArgs.command, { cwd: workspaceRoot, encoding: 'utf8' });
               resultOutput = { success: true, output: stdout.slice(0, 2000) };
            } catch (err) {
               resultOutput = { success: false, error: err.message };
            }
            
            contents.push({ role: 'model', parts: [{ functionCall: call }] });
            contents.push({ role: 'user', parts: [{ functionResponse: { name: 'runCommand', response: resultOutput } }] });
            
            finalResponse = await ai.models.generateContent({
              model: 'gemini-2.0-flash',
              contents: contents,
              config: { tools: [{ functionDeclarations: [runCommandDeclaration] }] }
            });
         }

         result = finalResponse.text;
      } catch (err) {
         console.error('[Web Preview] Agent Error:', err);
         result = 'Sorry, there was an error processing your request: ' + err.message;
      }
    }


    res.json({ result });
  });

  // Mock IPC send
  app.post('/api/ipc-send', (req, res) => {
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
