const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server.ts');
let content = fs.readFileSync(file, 'utf8');

const replacement = `
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
             { role: 'user', parts: [{ text: 'You are NOVA-X, an advanced autonomous AI desktop assistant. You have full system control. Fulfill the operator\\'s request. If asked to create a website, use runCommand to create files (e.g. echo "code" > index.html) and deploy it if requested. If asked to change wallpaper, use runCommand with appropriate OS commands. Ensure you execute tasks for real, do not simulate.' }] },
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
`;

content = content.replace(/\} else if \(channel === 'agent-run-task'\) \{[\s\S]*?\} catch \(err\) \{[\s\S]*?result = 'Sorry, there was an error processing your request: ' \+ err\.message;\n      \}\n    \}/, replacement.trim());

fs.writeFileSync(file, content, 'utf8');
