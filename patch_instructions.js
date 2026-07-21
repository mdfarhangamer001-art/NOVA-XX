const fs = require('fs');
const files = ['server.ts', 'src/main/lib/agent-brain.ts'];

const toolsSection = /AVAILABLE CAPABILITIES \\& TOOLS[\s\S]*?build_app_feature\(description\)\./;

const newToolsSection = `MULTI-AGENT ARCHITECTURE:
Do not build one giant AI handling everything. Split responsibilities into separate agents/tools, each specialized:
- Communication Agent -> handles WhatsApp, SMS, calls, email
- Device Control Agent -> handles lock/unlock, notifications, security detection
- Productivity Agent -> handles reminders, alarms, calendar, notes
- Media Agent -> handles music, video, wallpaper
- Developer Agent -> handles code, website, app-building requests
Each agent should only activate for its own domain, and the main JARVIS core should route the user's request to the correct agent automatically using the provided function calls. Do not try to answer these yourself; call the agent.`;

files.forEach(file => {
   if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      content = content.replace(toolsSection, newToolsSection.replace(/\n/g, '\\n'));
      fs.writeFileSync(file, content);
      console.log('Patched ' + file);
   }
});
