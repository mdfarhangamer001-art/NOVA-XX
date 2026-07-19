const fs = require('fs')
const path = require('path')
const file = path.join(__dirname, 'src/renderer/src/NovaXRoot.tsx')
let content = fs.readFileSync(file, 'utf8')

// The VAD calculates RMS.
content = content.replace(
  `const threshold = 0.005 // High-sensitivity RMS speech threshold`,
  `const threshold = 0.015 // Adjusted RMS speech threshold for better noise rejection`
)

fs.writeFileSync(file, content, 'utf8')
