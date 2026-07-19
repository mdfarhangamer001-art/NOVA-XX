const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/renderer/src/views/Activity.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/<BarChart2/g, '<BarChart');
content = content.replace(/<\/BarChart2>/g, '</BarChart>');

fs.writeFileSync(file, content, 'utf8');
