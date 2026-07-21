#!/bin/bash
sed -i 's/  const recognitionRef = useRef<any>(null)//' src/renderer/src/NovaXRoot.tsx
sed -i 's/    const stopRequestedRef = useRef(false)/const stopRequestedRef = useRef(false)\n  const recognitionRef = useRef<any>(null)/' src/renderer/src/NovaXRoot.tsx
sed -i 's/      setMicStatus('\''idle'\'');\n  }, \[isConnected, isMuted, isSpeaking\])/      setMicStatus('\''idle'\'');\n    };\n  }, [isConnected, isMuted, isSpeaking])/' src/renderer/src/NovaXRoot.tsx
