const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/renderer/src/views/Settings.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/alert\('API Keys securely encrypted and saved to NOVA-X Vault.'\)/g, "console.log('API Keys securely encrypted and saved to NOVA-X Vault.')");
content = content.replace(/alert\('Failed to save keys to the secure vault.'\)/g, "console.error('Failed to save keys to the secure vault.')");
content = content.replace(/alert\('API Keys saved to browser storage.'\)/g, "console.log('API Keys saved to browser storage.')");

fs.writeFileSync(file, content, 'utf8');
