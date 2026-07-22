const fs = require('fs')
const file = 'src/renderer/src/views/Settings.tsx'
let content = fs.readFileSync(file, 'utf8')

const target1 =
  'const updateVoices = () => {\n      setAvailableVoices(window.speechSynthesis.getVoices())\n    }'
const replacement1 = `const updateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      
      const premiumVoices = [];
      const addVoice = (keywords, customName) => {
         const voice = allVoices.find(v => keywords.some(k => v.name.includes(k)));
         if (voice) {
            premiumVoices.push({ ...voice, customName });
         }
      };

      addVoice(['Google UK English Female', 'Samantha', 'Karen', 'Tessa'], 'Aria (Warm & Clear Female)');
      addVoice(['Google US English Female', 'Victoria', 'Moira'], 'Elena (Natural Female)');
      addVoice(['Google UK English Male', 'Daniel', 'Rishi'], 'Arthur (JARVIS-style Male)');
      addVoice(['Google US English Male', 'Alex', 'Fred'], 'Marcus (Deep & Confident Male)');

      setAvailableVoices(premiumVoices);
    }`

content = content.replace(target1, replacement1)
fs.writeFileSync(file, content)
