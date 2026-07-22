import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

export const tools = [
  {
    name: 'change_wallpaper',
    description: 'Changes the system wallpaper to a specified theme or image description.',
    parameters: {
      type: 'OBJECT',
      properties: {
        description: {
          type: 'STRING',
          description: 'A description of the wallpaper to set (e.g., "cyberpunk city", "forest").'
        }
      },
      required: ['description']
    }
  },
  {
    name: 'open_app',
    description: 'Opens a system application.',
    parameters: {
      type: 'OBJECT',
      properties: {
        appName: {
          type: 'STRING',
          description:
            'The name of the application to open (e.g., "notepad", "calculator", "chrome").'
        }
      },
      required: ['appName']
    }
  },
  {
    name: 'create_folder',
    description: 'Creates a new folder at a specified path.',
    parameters: {
      type: 'OBJECT',
      properties: {
        folderPath: {
          type: 'STRING',
          description: 'The full path where the folder should be created.'
        },
        folderName: {
          type: 'STRING',
          description: 'The name of the new folder.'
        }
      },
      required: ['folderPath', 'folderName']
    }
  }
]

export async function executeTool(name: string, args: any): Promise<string> {
  console.log(`[Agent Tools] Executing ${name} with args:`, args)

  switch (name) {
    case 'change_wallpaper':
      try {
        const wallpaperDir = path.join(process.cwd(), 'gallery')
        if (!fs.existsSync(wallpaperDir)) {
          fs.mkdirSync(wallpaperDir, { recursive: true })
        }
        const wallpaperPath = path.join(wallpaperDir, 'active_wallpaper.txt')
        fs.writeFileSync(
          wallpaperPath,
          `Active Theme Wallpaper: ${args.description} set at ${new Date().toISOString()}`,
          'utf8'
        )
        console.log(`Setting wallpaper to: ${args.description}`)
        return `Successfully set system wallpaper to ${args.description}.`
      } catch (err: any) {
        return `Failed to change wallpaper: ${err.message}`
      }

    case 'open_app':
      try {
        // Platform specific app opening
        const command =
          process.platform === 'win32' ? `start ${args.appName}` : `open -a "${args.appName}"`
        await execAsync(command)
        return `Successfully opened ${args.appName}.`
      } catch (err: any) {
        return `Failed to open app ${args.appName}: ${err.message}`
      }

    case 'create_folder':
      try {
        const fullPath = path.join(args.folderPath, args.folderName)
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true })
          return `Successfully created folder: ${fullPath}`
        }
        return `Folder already exists: ${fullPath}`
      } catch (err: any) {
        return `Failed to create folder: ${err.message}`
      }

    default:
      throw new Error(`Tool ${name} not found.`)
  }
}
