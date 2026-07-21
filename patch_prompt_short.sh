#!/bin/bash
sed -i 's/- Lead with the result first, explanation after (if needed at all)./- Lead with the result first, explanation after (if needed at all).\n- Extremely important: Give highly concise and short responses. Do not use extra tokens unless necessary./' src/renderer/src/components/UI/RightPanel.tsx
