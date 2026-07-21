#!/bin/bash
sed -i "s/model: 'whisper-large-v3-turbo',/model: 'whisper-large-v3',/g" src/main/lib/system.ts
sed -i "s/prompt: 'hello, JARVIS, how can I help you, Boss? Kaise ho yaar.'/prompt: 'hello, JARVIS, how can I help you, Boss? Kaise ho yaar. Main jo bol raha hoon use dhyan se suno. Text to speech accuracy 100% honi chahiye. hindi hinglish english', language: 'hi'/g" src/main/lib/system.ts
