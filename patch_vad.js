const fs = require('fs')
const file = 'src/renderer/src/NovaXRoot.tsx'
let content = fs.readFileSync(file, 'utf8')

const targetStart = '  // Modern VAD-based Voice Recognition Core\n  useEffect(() => {'
const targetEnd = '\n  }, [isConnected, isMuted, isSpeaking])'

const startIndex = content.indexOf(targetStart)
const endIndex = content.indexOf(targetEnd) + targetEnd.length

const newImplementation = `  // Web Speech API Voice Recognition Core
  useEffect(() => {
    if (!isConnected || isMuted || isSpeaking) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setMicStatus('idle');
      return;
    }

    const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Speech) {
      console.warn("Speech Recognition not supported.");
      return;
    }

    const recognition = new Speech();
    recognition.continuous = true;
    recognition.interimResults = false;
    // Set lang to hi-IN to match user's Hindi / Hinglish request
    recognition.lang = 'hi-IN';

    recognition.onstart = () => {
      setMicStatus('listening');
      window.dispatchEvent(
        new CustomEvent('novax_mic_state', { detail: { status: 'listening' } })
      );
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        }
      }
      const transcript = finalTranscript.trim();
      
      if (transcript && transcript.length > 0) {
        console.log('[Web Speech API] Final Transcript:', transcript);
        if ((window as any).triggerVoiceCommand) {
          (window as any).triggerVoiceCommand(transcript);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setMicStatus('idle');
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
         // Auto-restart logic if desired could go here
      }
    };

    recognition.onend = () => {
       // If it ended automatically but the call is still connected and not muted, we restart it.
       // The user requested a push-to-talk style toggle, so if isMuted is false (mic ON), we keep listening.
       if (!isMuted && isConnected && !isSpeaking) {
          recognition.start();
       } else {
          setMicStatus('idle');
       }
    };

    recognitionRef.current = recognition;
    recognition.start();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null; // Prevent restart loop
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setMicStatus('idle');
    };
  }, [isConnected, isMuted, isSpeaking]);`

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newImplementation + content.substring(endIndex)
  fs.writeFileSync(file, content)
  console.log('Successfully patched NovaXRoot.tsx')
} else {
  console.log('Failed to find target block in NovaXRoot.tsx')
}
