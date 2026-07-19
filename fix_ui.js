const fs = require('fs')
const path = require('path')
const file = path.join(__dirname, 'src/renderer/src/components/UI/RightPanel.tsx')
let content = fs.readFileSync(file, 'utf8')

content = content.replace(
  `bg-zinc-950/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl`,
  `bg-zinc-950/80 backdrop-blur-3xl border border-white/5 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]`
)

fs.writeFileSync(file, content, 'utf8')

const file2 = path.join(__dirname, 'src/renderer/src/components/UI/LeftPanels.tsx')
let content2 = fs.readFileSync(file2, 'utf8')
content2 = content2.replace(
  `bg-zinc-950/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl`,
  `bg-zinc-950/80 backdrop-blur-3xl border border-white/5 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]`
)
fs.writeFileSync(file2, content2, 'utf8')

const file3 = path.join(__dirname, 'src/renderer/src/views/Settings.tsx')
let content3 = fs.readFileSync(file3, 'utf8')
content3 = content3.replace(
  `bg-black/40 border border-white/10`,
  `bg-white/[0.02] border border-white/5 backdrop-blur-md`
)
fs.writeFileSync(file3, content3, 'utf8')
