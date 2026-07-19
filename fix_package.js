const fs = require('fs')
const path = require('path')
const file = path.join(__dirname, 'package.json')
let content = fs.readFileSync(file, 'utf8')
const pkg = JSON.parse(content)
pkg.scripts.dev = 'tsx server.ts'
fs.writeFileSync(file, JSON.stringify(pkg, null, 2), 'utf8')
