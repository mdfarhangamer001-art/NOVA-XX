// Mock Electron API for browser environments in AI Studio
if (typeof window !== 'undefined') {
  // Mock window.electron
  if (!window.electron) {
    const apiKeys = {
      geminiKey: localStorage.getItem('mock_geminiKey') || '',
      groqKey: localStorage.getItem('mock_groqKey') || '',
      hfKey: localStorage.getItem('mock_hfKey') || '',
      tavilyKey: localStorage.getItem('mock_tavilyKey') || '',
    };

    const adbHistory = JSON.parse(localStorage.getItem('mock_adbHistory') || '[]');

    let adbConnected = false;

    const mockIpcRenderer = {
      send: (channel: string, ...args: any[]) => {
        console.log(`[Mock Electron IPC] send: ${channel}`, args);
      },
      on: (channel: string, func: (...args: any[]) => void) => {
        console.log(`[Mock Electron IPC] on: ${channel}`);
        return () => {};
      },
      invoke: async (channel: string, ...args: any[]) => {
        console.log(`[Mock Electron IPC] invoke: ${channel}`, args);
        
        if (channel === 'get-system-stats') {
          // Generate realistic mock telemetry stats
          const cpuValue = (20 + Math.random() * 40).toFixed(1);
          const ramValue = (45 + Math.random() * 15).toFixed(1);
          const tempValue = 38 + Math.random() * 12;
          const txValue = Math.floor(Math.random() * 25) + 5;
          const rxValue = Math.floor(Math.random() * 50) + 10;
          return {
            cpu: cpuValue,
            memory: {
              total: '16.0',
              free: '8.4',
              usedPercentage: ramValue
            },
            temperature: tempValue,
            os: {
              type: 'AI Studio Sandbox',
              uptime: '2.4h'
            },
            network: {
              tx: txValue,
              rx: rxValue,
              latency: Math.floor(20 + Math.random() * 15)
            }
          };
        }

        if (channel === 'get-installed-apps') {
          return [
            { name: 'Chrome Browser', id: 'chrome' },
            { name: 'Visual Studio Code', id: 'vscode' },
            { name: 'Spotify Music', id: 'spotify' },
            { name: 'Discord Chat', id: 'discord' },
            { name: 'Terminal Shell', id: 'terminal' },
          ];
        }

        if (channel === 'get-drives') {
          return [
            { Name: 'System SSD (C:)', FreeGB: '142.5', TotalGB: '512.0' },
            { Name: 'External Drive (D:)', FreeGB: '840.1', TotalGB: '1000.0' }
          ];
        }

        if (channel === 'secure-get-keys') {
          return apiKeys;
        }

        if (channel === 'secure-save-keys') {
          const keys = args[0] || {};
          Object.assign(apiKeys, keys);
          localStorage.setItem('mock_geminiKey', keys.geminiKey || '');
          localStorage.setItem('mock_groqKey', keys.groqKey || '');
          localStorage.setItem('mock_hfKey', keys.hfKey || '');
          localStorage.setItem('mock_tavilyKey', keys.tavilyKey || '');
          return true;
        }

        if (channel === 'adb-get-history') {
          return adbHistory.length > 0 ? adbHistory : [
            { model: 'Pixel 8 Pro (Simulated)', ip: '192.168.1.15', port: '5555' }
          ];
        }

        if (channel === 'adb-connect') {
          adbConnected = true;
          return { success: true };
        }

        if (channel === 'adb-disconnect') {
          adbConnected = false;
          return { success: true };
        }

        if (channel === 'adb-telemetry') {
          return {
            success: true,
            data: {
              model: 'PIXEL 8 PRO (SIM)',
              os: 'ANDROID 14 (UPLINKED)',
              battery: { level: 84, isCharging: true, temp: '34.2' },
              storage: { used: '112.5 GB', total: '256.0 GB TOTAL', percent: 43.9 }
            }
          };
        }

        if (channel === 'adb-get-notifications') {
          return { success: true, data: [] };
        }

        if (channel === 'adb-screenshot') {
          return { 
            success: true, 
            image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="650" viewBox="0 0 320 650"><rect width="100%" height="100%" fill="%23121214"/><text x="50%" y="45%" fill="%2300ff88" font-family="monospace" font-size="14" text-anchor="middle">ADB SCREEN FEED</text><text x="50%" y="50%" fill="%23ffffff" font-family="monospace" font-size="12" text-anchor="middle" opacity="0.5">Simulated Pixel 8 Pro</text></svg>' 
          };
        }

        if (channel === 'adb-quick-action') {
          console.log(`[Mock ADB Quick Action] ${args[0]?.action}`);
          return { success: true };
        }

        return null;
      }
    };

    (window as any).electron = {
      ipcRenderer: mockIpcRenderer,
      process: {
        platform: 'linux'
      }
    };
  }

  // Mock window.iris
  if (!(window as any).iris) {
    const mockTranscriptCallbacks: any[] = [];
    const mockTranscriptCompleteCallbacks: any[] = [];
    const chatHistory = [
      { role: 'user', text: 'Hello, system' },
      { role: 'model', text: 'Greetings, Boss. I am NOVA-X. How can I assist you today?' }
    ];

    (window as any).iris = {
      getHistory: async () => chatHistory,
      onTranscript: (callback: any) => {
        mockTranscriptCallbacks.push(callback);
      },
      onTranscriptComplete: (callback: any) => {
        mockTranscriptCompleteCallbacks.push(callback);
      },
      sendVisionFrame: (frame: string) => {
        // Frame is a base64 jpeg
      }
    };

    // Simulate occasional incoming transcript messages to make the interface look alive!
    setTimeout(() => {
      const triggerSimulatedChat = () => {
        const triggers = [
          { user: "Analyze current system stats", model: "Current CPU usage is 28.4%. Temperature is stabilized at 41.2°C. All telemetry nodes are running optimally." },
          { user: "Show me connected devices", model: "Uplink is secure on device Pixel 8 Pro at port 5555. ADB bridge connection shows 84% battery charge." },
          { user: "Check for updates", model: "System is fully up-to-date. NOVA-X Neural Engine is running version 1.6.3." }
        ];
        const randomTrigger = triggers[Math.floor(Math.random() * triggers.length)];
        
        mockTranscriptCallbacks.forEach(cb => cb({ role: 'user', text: randomTrigger.user, isFinal: true }));
        
        setTimeout(() => {
          let words = randomTrigger.model.split(' ');
          let currentWordIndex = 0;
          const interval = setInterval(() => {
            if (currentWordIndex < words.length) {
              mockTranscriptCallbacks.forEach(cb => cb({ role: 'model', text: words[currentWordIndex] + ' ', isFinal: false }));
              currentWordIndex++;
            } else {
              clearInterval(interval);
              mockTranscriptCompleteCallbacks.forEach(cb => cb());
            }
          }, 120);
        }, 1500);
      };

      triggerSimulatedChat();
      setInterval(triggerSimulatedChat, 20000);
    }, 5000);
  }
}
export {};
