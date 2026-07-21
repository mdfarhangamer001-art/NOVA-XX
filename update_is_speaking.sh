#!/bin/bash
sed -i 's/if (!isConnected || isMuted || isSpeaking) {/if (!isConnected || isMuted) {/g' src/renderer/src/NovaXRoot.tsx
sed -i 's/if (!isMuted && isConnected && !isSpeaking) {/if (!isMuted && isConnected) {/g' src/renderer/src/NovaXRoot.tsx
