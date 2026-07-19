const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, 'src/renderer/src')

const map = {
  GiArtificialIntelligence: 'Brain',
  RiKeyLine: 'Key',
  RiSettings4Line: 'Settings',
  RiCpuLine: 'Cpu',
  RiGamepadLine: 'Gamepad2',
  RiPlugLine: 'Plug',
  RiCheckDoubleLine: 'CheckCheck',
  RiEyeOffLine: 'EyeOff',
  RiEyeLine: 'Eye',
  RiShieldCheckLine: 'ShieldCheck',
  RiCloseLine: 'X',
  RiSubtractLine: 'Minus',
  RiSquareLine: 'Square',
  RiImageLine: 'Image',
  RiDeleteBin6Line: 'Trash2',
  RiFolderOpenLine: 'FolderOpen',
  RiCalendarCheckLine: 'CalendarCheck',
  RiGamepadLine: 'Gamepad2',
  RiFileTextLine: 'FileText',
  RiFolderZipLine: 'FileArchive',
  RiCodeBoxLine: 'Code',
  RiDownloadCloud2Line: 'CloudDownload',
  RiFileCopyLine: 'Copy',
  RiPencilLine: 'Pen',
  RiSearchLine: 'Search',
  RiHistoryLine: 'History',
  RiSendPlaneFill: 'Send',
  RiAppsLine: 'LayoutGrid',
  RiCameraLensLine: 'Camera',
  RiGamepadLine: 'Gamepad2',
  RiLayoutGridLine: 'LayoutGrid',
  RiSmartphoneLine: 'Smartphone',
  RiMenuUnfoldLine: 'Menu',
  RiMenuFoldLine: 'Menu',
  RiNotification3Line: 'Bell',
  RiDashboardLine: 'LayoutDashboard',
  RiMapPinUserLine: 'MapPin',
  RiGalleryLine: 'Images',
  RiUserSmileLine: 'Smile',
  RiArrowRightSLine: 'ChevronRight',
  RiMicLine: 'Mic',
  RiMicOffLine: 'MicOff',
  RiAddLine: 'Plus',
  RiCheckLine: 'Check'
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

      // Extract all imports from react-icons/ri and react-icons/gi
      const regex = /import\s+\{([^}]+)\}\s+from\s+['"]react-icons\/(ri|gi)['"]/g
      let match
      let iconsToAdd = new Set()

      let newContent = content.replace(regex, (fullMatch, imports, pkg) => {
        const icons = imports
          .split(',')
          .map((i) => i.trim())
          .filter(Boolean)
        for (const icon of icons) {
          if (map[icon]) {
            iconsToAdd.add(map[icon])
          } else {
            // Just strip Ri and Line/Fill
            let newIcon = icon.replace(/^(Ri|Gi)/, '').replace(/(Line|Fill)$/, '')
            iconsToAdd.add(newIcon)
            map[icon] = newIcon
          }
        }
        changed = true
        return '' // Remove the old import
      })

      if (changed) {
        // Now replace the JSX usages
        for (const oldIcon in map) {
          const newIcon = map[oldIcon]
          const jsxRegex = new RegExp('<' + oldIcon + '(\\s|>)', 'g')
          newContent = newContent.replace(jsxRegex, '<' + newIcon + '$1')
        }

        // Add to existing lucide-react import or create new one
        if (iconsToAdd.size > 0) {
          const addStr = Array.from(iconsToAdd).join(', ')
          if (newContent.includes("from 'lucide-react'")) {
            newContent = newContent.replace(
              /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/,
              (match, existing) => {
                const all = new Set([
                  ...existing
                    .split(',')
                    .map((i) => i.trim())
                    .filter(Boolean),
                  ...iconsToAdd
                ])
                return `import { ${Array.from(all).join(', ')} } from 'lucide-react'`
              }
            )
          } else {
            newContent = `import { ${addStr} } from 'lucide-react'\n` + newContent
          }
        }

        fs.writeFileSync(p, newContent, 'utf8')
      }
    }
  }
}

walk(dir)
console.log('Done migrating icons')
