/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain, app } from 'electron'
import { GoogleGenAI } from '@google/genai'
import { getGeminiApiKey } from './apiKey'
import { exec } from 'child_process'
import path from 'path'
import fs from 'fs'

/** Applies a generated image as the OS desktop wallpaper, per-platform. */
function applyWallpaper(imagePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (process.platform === 'win32') {
      const psScript = `
        Add-Type @"
        using System.Runtime.InteropServices;
        public class NovaXWallpaper {
          [DllImport("user32.dll", CharSet=CharSet.Auto)]
          public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
        }
"@
        [NovaXWallpaper]::SystemParametersInfo(20, 0, "${imagePath.replace(/\\/g, '\\\\')}", 3)
      `.trim()
      exec(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`, (error) => {
        if (error) reject(error)
        else resolve()
      })
    } else if (process.platform === 'darwin') {
      exec(
        `osascript -e 'tell application "Finder" to set desktop picture to POSIX file "${imagePath}"'`,
        (error) => {
          if (error) reject(error)
          else resolve()
        }
      )
    } else {
      const uri = `file://${imagePath}`
      exec(`gsettings set org.gnome.desktop.background picture-uri "${uri}"`, (error) => {
        if (error) reject(error)
        else resolve()
      })
    }
  })
}

export function registerWallpaperHandlers(): void {
  ipcMain.removeHandler('generate-wallpaper')
  ipcMain.handle('generate-wallpaper', async (_event, description: string) => {
    const apiKey = getGeminiApiKey()
    if (!apiKey) {
      return { success: false, error: 'Gemini API Key is missing. Please set it in Settings > API Vault.' }
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      })

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: `Generate a stunning, high-resolution 16:9 desktop wallpaper: ${description}. No text, no watermarks, no logos.`,
        config: {
          responseModalities: ['TEXT', 'IMAGE']
        }
      })

      const parts = response.candidates?.[0]?.content?.parts || []
      const imagePart = parts.find((p: any) => p.inlineData)

      if (!imagePart || !imagePart.inlineData) {
        return { success: false, error: 'Model did not return an image. Try rephrasing the description.' }
      }

      const wallpaperDir = path.join(app.getPath('userData'), 'wallpapers')
      fs.mkdirSync(wallpaperDir, { recursive: true })
      const fileName = `wallpaper-${Date.now()}.png`
      const filePath = path.join(wallpaperDir, fileName)

      // Ensure image data is a string before processing to resolve type-check error
      const base64Data = imagePart.inlineData.data
      if (typeof base64Data === 'string') {
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'))
      } else {
        return { success: false, error: 'Image data format is invalid.' }
      }

      await applyWallpaper(filePath)

      return { success: true, filePath }
    } catch (err: any) {
      console.error('[NOVA-X Wallpaper] Generation/apply failed:', err)
      return { success: false, error: err.message }
    }
  })
    }
