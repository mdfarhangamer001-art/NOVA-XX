const fs = require('fs')
const files = [
  'server.ts',
  'src/main/lib/agent-brain.ts',
  'src/renderer/src/components/UI/RightPanel.tsx'
]

const newToolsSection = `MULTI-AGENT ARCHITECTURE:
Do not build one giant AI handling everything. Split responsibilities into separate agents/tools, each specialized:
- Communication Agent -> handles WhatsApp, SMS, calls, email
- Device Control Agent -> handles lock/unlock, notifications, security detection
- Productivity Agent -> handles reminders, alarms, calendar, notes
- Media Agent -> handles music, video, wallpaper
- Developer Agent -> handles code, website, app-building requests
Each agent should only activate for its own domain, and the main JARVIS core should route the user's request to the correct agent automatically using the provided function calls. Do not try to answer these yourself; call the agent.`

files.forEach((file) => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8')
    const startIdx = content.indexOf('AVAILABLE CAPABILITIES & TOOLS')
    if (startIdx !== -1) {
      // Find the end of the string. In RightPanel.tsx, the string ends with a backtick \`
      const endIdx = content.indexOf('\`', startIdx)
      if (endIdx !== -1) {
        content = content.substring(0, startIdx) + newToolsSection + content.substring(endIdx)
        fs.writeFileSync(file, content)
        console.log('Patched ' + file)
      }
    }
  }
})
