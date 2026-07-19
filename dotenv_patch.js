const fs = require('fs')
const path = require('path')
const file = path.join(__dirname, 'src/main/index.ts')
let content = fs.readFileSync(file, 'utf8')
if (!content.includes('dotenv.config()')) {
  content = `import dotenv from 'dotenv'\ndotenv.config()\n` + content
  fs.writeFileSync(file, content, 'utf8')
}
