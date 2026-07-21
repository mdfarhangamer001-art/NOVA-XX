import { getGeminiClient, getGeminiModelName } from '../ai-clients';
import { logActivity } from './activity-memory';

export async function analyzeVision(base64Image: string, source: 'camera' | 'screen'): Promise<string> {
  try {
    const ai = getGeminiClient();
    const dynamicModel = await getGeminiModelName(ai, 'vision');

    const prompt = source === 'camera' 
      ? "Describe what the user is doing in this webcam snapshot. Be concise and human-like (e.g., 'User is reading a book', 'User is drinking coffee')."
      : "Describe what is happening on the user's screen. Identify the active applications and the general task (e.g., 'User is coding in VS Code', 'User is browsing YouTube').";

    const imagePart = {
      inlineData: {
        data: base64Image.split(',')[1] || base64Image,
        mimeType: 'image/jpeg'
      }
    };
    
    const textPart = {
      text: prompt
    };

    const result = await ai.models.generateContent({
      model: dynamicModel,
      contents: { parts: [imagePart, textPart] }
    });

    const description = result.text || 'No description generated.';
    logActivity(source, description);
    return description;
  } catch (err: any) {
    console.error(`[Optics] Analysis failed for ${source}:`, err);
    return `Error analyzing ${source}: ${err.message}`;
  }
}
