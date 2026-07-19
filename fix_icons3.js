const fs = require('fs')
const path = require('path')

const map = {
  CheckboxBlank: 'Square',
  CheckboxMultipleBlank: 'Copy',
  Pulse: 'Activity',
  CodeBox: 'Code'
}

function walk(directory) {
  const files = fs.readdirSync(directory)
  for (const file of files) {
    const p = path.join(directory, file)
    if (fs.statSync(p).isDirectory()) {
      walk(p)
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      let content = fs.readFileSync(p, 'utf8')
      let changed = false

      for (const [bad, good] of Object.entries(map)) {
        if (content.includes(bad)) {
          // Use word boundary to avoid matching substring inside another icon
          content = content.replace(new RegExp('\\b' + bad + '\\b', 'g'), good)
          changed = true
        }
      }

      if (changed) {
        fs.writeFileSync(p, content, 'utf8')
      }
    }
  }
}

walk(path.join(__dirname, 'src/renderer/src'))
