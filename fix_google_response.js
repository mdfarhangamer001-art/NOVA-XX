const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/main/lib/system.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `resolve({ success: true, user: { name: 'Tehzeeb', email: 'xtehzeeb.x7@gmail.com', token: code } });`,
  `resolve({ success: true, name: 'Tehzeeb', email: 'xtehzeeb.x7@gmail.com', token: code, syncTime: new Date().toLocaleTimeString(), avatar: '' });`
);

fs.writeFileSync(file, content, 'utf8');
