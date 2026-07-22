const fs = require('fs')
const file = 'src/renderer/src/views/Settings.tsx'
let content = fs.readFileSync(file, 'utf8')

const target2 = "{voice.name} ({voice.lang}) {voice.localService ? '[Local]' : ''}"
const replacement2 = '{(voice as any).customName || voice.name} ({voice.lang})'

content = content.replace(target2, replacement2)
content = content.replace('useState<SpeechSynthesisVoice[]>([])', 'useState<any[]>([])')

fs.writeFileSync(file, content)
