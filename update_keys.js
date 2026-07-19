const fs = require('fs')
const path = require('path')
const file = path.join(__dirname, 'src/main/lib/system.ts')
let content = fs.readFileSync(file, 'utf8')

content = content.replace(
  `        const decrypted = safeStorage.decryptString(Buffer.from(encryptedBase64, 'base64'))
          return JSON.parse(decrypted)
        }
        return store.get('secure_api_keys') || {}`,
  `        const decrypted = safeStorage.decryptString(Buffer.from(encryptedBase64, 'base64'))
          const parsed = JSON.parse(decrypted)
          return {
            geminiKey: process.env.GEMINI_API_KEY || parsed.geminiKey,
            groqKey: process.env.GROQ_API_KEY || parsed.groqKey,
            hfKey: process.env.HF_API_KEY || parsed.hfKey,
            tavilyKey: process.env.TAVILY_API_KEY || parsed.tavilyKey,
            openrouterKey: process.env.OPENROUTER_API_KEY || parsed.openrouterKey
          }
        }
        const fallback: any = store.get('secure_api_keys') || {}
        return {
            geminiKey: process.env.GEMINI_API_KEY || fallback.geminiKey,
            groqKey: process.env.GROQ_API_KEY || fallback.groqKey,
            hfKey: process.env.HF_API_KEY || fallback.hfKey,
            tavilyKey: process.env.TAVILY_API_KEY || fallback.tavilyKey,
            openrouterKey: process.env.OPENROUTER_API_KEY || fallback.openrouterKey
        }`
)

fs.writeFileSync(file, content, 'utf8')
