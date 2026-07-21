#!/bin/bash
sed -i 's/const stopRequestedRef = useRef(false)/const stopRequestedRef = useRef(false)\n  const recognitionRef = useRef<any>(null)/g' src/renderer/src/NovaXRoot.tsx
