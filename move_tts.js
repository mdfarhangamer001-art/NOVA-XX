const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/renderer/src/NovaXRoot.tsx');
let content = fs.readFileSync(file, 'utf8');

const ttsCode = `
  useEffect(() => {
    ;(window as any).speakText = (text: string) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;
      const voices = window.speechSynthesis.getVoices();
      // Try to find a good female English voice like Google UK English Female or Microsoft Zira
      const voice = voices.find((v) => v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha') || (v.lang === 'en-US' && v.name.includes('Google'))) || voices[0];
      if (voice) utterance.voice = voice;
      
      utterance.onstart = () => {
        if (typeof (window as any).setIsSpeaking === 'function') {
          ;(window as any).setIsSpeaking(true);
        }
      };
      utterance.onend = () => {
        if (typeof (window as any).setIsSpeaking === 'function') {
          ;(window as any).setIsSpeaking(false);
        }
      };
      utterance.onerror = () => {
        if (typeof (window as any).setIsSpeaking === 'function') {
          ;(window as any).setIsSpeaking(false);
        }
      };
      
      window.speechSynthesis.speak(utterance);
    };

    return () => {
      delete (window as any).speakText;
    };
  }, []);
`;

content = content.replace('  // Modern VAD-based Voice Recognition Core', ttsCode + '\n  // Modern VAD-based Voice Recognition Core');

fs.writeFileSync(file, content, 'utf8');
