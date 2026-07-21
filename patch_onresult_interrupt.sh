#!/bin/bash
sed -i 's/console.log('\''\[Web Speech API\] Final Transcript:'\'', transcript);/console.log('\''\[Web Speech API\] Final Transcript:'\'', transcript);\n        if (window.speechSynthesis) {\n          window.speechSynthesis.cancel();\n        }/g' src/renderer/src/NovaXRoot.tsx
