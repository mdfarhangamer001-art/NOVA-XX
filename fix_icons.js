const fs = require('fs')
const path = require('path')

const map = {
  TerminalWindow: 'Terminal',
  Save3: 'Save',
  Key2: 'Key',
  ShieldKeyhole: 'Shield',
  DeleteBin: 'Trash2',
  Markdown: 'FileCode'
}

function walk(directory) {
  const files = fs.readdirSync(directory)
  for (const file of files) {
    const p = path.join(directory, file)
    if (fs.statSync(p).isDirectory()) {
      walk(p)
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      let content = fs.readFileSync(p, 'utf8')
      let changed = false

      for (const [bad, good] of Object.entries(map)) {
        if (content.includes(bad)) {
          content = content.replace(new RegExp(bad, 'g'), good)
          changed = true
        }
      }

      if (changed) {
        fs.writeFileSync(p, content, 'utf8')
      }
    }
  }
}

walk(path.join(__dirname, 'src/renderer/src'))
const fs = require('fs')
const path = require('path')

const map = {
  MentalHealth: 'Heart',
  CodeBox: 'Code',
  FileText: 'FileText',
  DownloadCloud2: 'CloudDownload',
  FileCopy: 'Copy',
  MapPinUser: 'MapPin',
  ArrowRightS: 'ChevronRight',
  LayoutGrid: 'LayoutGrid'
}

function walk(directory) {
  const files = fs.readdirSync(directory)
  for (const file of files) {
    const p = path.join(directory, file)
    if (fs.statSync(p).isDirectory()) {
      walk(p)
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      let content = fs.readFileSync(p, 'utf8')
      let changed = false

      for (const [bad, good] of Object.entries(map)) {
        if (content.includes(bad)) {
          content = content.replace(new RegExp(bad, 'g'), good)
          changed = true
        }
      }

      if (changed) {
        fs.writeFileSync(p, content, 'utf8')
      }
    }
  }
}

walk(path.join(__dirname, 'src/renderer/src'))
