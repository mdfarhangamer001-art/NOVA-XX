const fs = require('fs')
const path = require('path')
const file = path.join(__dirname, 'src/renderer/src/components/UI/RightPanel.tsx')
let content = fs.readFileSync(file, 'utf8')

content = content.replace(
  `      const isRealElectron = typeof window !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron')
      if (isRealElectron && window.electron?.ipcRenderer) {
        const res = await window.electron.ipcRenderer.invoke('agent-run-task', cleanQuery)
        const answer = typeof res === 'string' ? res : res.response || res.error || 'No valid response received.'
        
        setActiveModelText('')
        const modelMessage: Message = { role: 'model', text: answer }
        setChatHistory((prev) => [...prev, modelMessage].slice(-30))

        if (typeof (window as any).setIsSpeaking === 'function') {
          ;(window as any).setIsSpeaking(false)
        }
      } else {`,
  `      if (window.electron?.ipcRenderer) {
        const res = await window.electron.ipcRenderer.invoke('agent-run-task', cleanQuery)
        const answer = typeof res === 'string' ? res : res.response || res.error || 'No valid response received.'
        
        setActiveModelText('')
        const modelMessage: Message = { role: 'model', text: answer }
        setChatHistory((prev) => [...prev, modelMessage].slice(-30))

        if (typeof (window as any).setIsSpeaking === 'function') {
          ;(window as any).setIsSpeaking(false)
        }
      } else {`
)

fs.writeFileSync(file, content, 'utf8')
