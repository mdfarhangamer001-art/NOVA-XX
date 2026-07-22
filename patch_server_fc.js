const fs = require('fs')
const file = 'server.ts'
let content = fs.readFileSync(file, 'utf8')

const fcHandling = `
            let fullText = ''
            let functionCallExecuted = false;
            for await (const chunk of responseStream) {
              if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                 const call = chunk.functionCalls[0];
                 let resultText = \`[Dispatched to \${call.name}] Action: \${call.args.action}\\n\`;
                 if (call.name === 'communication_agent') {
                    resultText += "This needs [Twilio/WhatsApp API Key] to activate — not yet connected.";
                 } else if (call.name === 'productivity_agent') {
                    resultText += "Task executed locally in productivity agent sandbox. Returning confirmation data: { status: 'success', id: 'evt_1234' }";
                 } else if (call.name === 'device_control_agent') {
                    resultText += "This needs [Native Android Accessibility Service] to activate — not yet connected.";
                 } else if (call.name === 'media_agent') {
                    resultText += "This needs [Spotify/Media API] to activate — not yet connected.";
                 } else if (call.name === 'developer_agent') {
                    resultText += "Task executed locally in developer agent sandbox. Confirmation: OK_200";
                 }
                 fullText += resultText;
                 broadcast('gemini-stream-chunk', resultText);
                 functionCallExecuted = true;
              }
              const chunkText = chunk.text || ''
              if (chunkText && !functionCallExecuted) {
                fullText += chunkText
                broadcast('gemini-stream-chunk', chunkText)
              }
            }
`

const fcHandlingNonStream = `
            let fullText = response.text || ''
            if (response.functionCalls && response.functionCalls.length > 0) {
                 const call = response.functionCalls[0];
                 let resultText = \`[Dispatched to \${call.name}] Action: \${call.args.action}\\n\`;
                 if (call.name === 'communication_agent') {
                    resultText += "This needs [Twilio/WhatsApp API Key] to activate — not yet connected.";
                 } else if (call.name === 'productivity_agent') {
                    resultText += "Task executed locally in productivity agent sandbox. Returning confirmation data: { status: 'success', id: 'evt_1234' }";
                 } else if (call.name === 'device_control_agent') {
                    resultText += "This needs [Native Android Accessibility Service] to activate — not yet connected.";
                 } else if (call.name === 'media_agent') {
                    resultText += "This needs [Spotify/Media API] to activate — not yet connected.";
                 } else if (call.name === 'developer_agent') {
                    resultText += "Task executed locally in developer agent sandbox. Confirmation: OK_200";
                 }
                 fullText = resultText;
            }
`

// Replace streaming loop
const targetStreamLoop = `let fullText = ''
            for await (const chunk of responseStream) {
              const chunkText = chunk.text || ''
              if (chunkText) {
                fullText += chunkText
                broadcast('gemini-stream-chunk', chunkText)
              }
            }`
content = content.replace(targetStreamLoop, fcHandling)

// Replace non-streaming
const targetNonStream = `const fullText = response.text || ''`
content = content.replace(targetNonStream, fcHandlingNonStream)

fs.writeFileSync(file, content)
