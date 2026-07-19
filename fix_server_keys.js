const fs = require('fs')
const path = require('path')
const file = path.join(__dirname, 'server.ts')
let content = fs.readFileSync(file, 'utf8')

content = content.replace(
  `let result = null;`,
  `let result = null;\n    if (!global.mockKeys) global.mockKeys = {};`
)

content = content.replace(
  `} else if (channel === 'secure-save-keys') {
      result = { success: true };
    }`,
  `} else if (channel === 'secure-save-keys') {
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
    }`
)

fs.writeFileSync(file, content, 'utf8')
