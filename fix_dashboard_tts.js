const fs = require('fs')
const path = require('path')
const file = path.join(__dirname, 'src/renderer/src/views/Dashboard.tsx')
const lines = fs.readFileSync(file, 'utf8').split('\n')

const out = []
let skip = false
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(';(window as any).speakText = (text: string) => {')) {
    skip = true
    out.pop() // remove useEffect
  }

  if (skip && lines[i].includes('delete (window as any).speakText')) {
    skip = false
    i += 3 // skip to end of useEffect
    continue
  }

  if (!skip) out.push(lines[i])
}

fs.writeFileSync(file, out.join('\n'), 'utf8')
