/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain } from 'electron'
import { GoogleGenAI } from '@google/genai'
import { getGeminiApiKey } from './apiKey'

/**
 * Why this file exists:
 *
 * The renderer previously relied on the browser's native
 * `webkitSpeechRecognition` API for voice input. That API works fine in a
 * real Chrome browser because Chrome ships with a Google-owned API key that
 * lets it stream audio to Google's speech servers. Electron's bundled
 * Chromium does NOT include that key. The practical result: the mic
 * indicator turns on, `onstart` fires, the user speaks — and `onresult`
 * silently never fires (or `onerror` fires with a generic "network" error).
 * It looks like nothing is broken, but no transcript ever arrives.
 *
 * Fix: capture the audio ourselves in the renderer (getUserMedia +
 * MediaRecorder) and transcribe it here, through the same Gemini API key
 * the rest of the app already uses. No new API key field needed — it reuses
 * apiKey.ts.
 */
export function registerSpeechHandlers(): void {
  ipcMain.removeHandler('nova-transcribe-audio')
  ipcMain.handle(
    'nova-transcribe-audio',
    async (_event, base64Audio: string, mimeType: string, languageHint?: string) => {
      try {
        const apiKey = getGeminiApiKey()
        if (!apiKey) {
          return { success: false, error: 'Gemini API Key is missing. Please set it in Settings > API Vault.' }
        }

        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        })

        const langLine = languageHint ? `The speaker's language is likely: ${languageHint}.` : ''

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [
            {
              inlineData: {
                data: base64Audio,
                mimeType: mimeType || 'audio/webm'
              }
            },
            `Transcribe the spoken audio exactly as spoken. ${langLine} ` +
              `Respond with ONLY the transcript text — no quotes, no commentary, no translation. ` +
              `If there is no discernible speech (silence, noise only), respond with an empty string.`
          ]
        })

        const transcript = (response.text || '').trim()
        return { success: true, transcript }
      } catch (err: any) {
        console.error('[NOVA-X Speech] Transcription failed:', err)
        return { success: false, error: err.message }
      }
    }
  )
}
