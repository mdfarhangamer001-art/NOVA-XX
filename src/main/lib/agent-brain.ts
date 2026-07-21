import { getGeminiClient, getGeminiModelName } from '../ai-clients';
import { tools, executeTool } from './agent-tools';
import { getRecentActivitySummary } from './activity-memory';

function fallbackCommandParser(prompt: string): { toolName?: string; args?: any; reply: string } {
  const normalized = prompt.toLowerCase();
  
  if (normalized.includes('wallpaper') || normalized.includes('background') || normalized.includes('badlo')) {
    let description = 'cyberpunk city';
    if (normalized.includes('nature') || normalized.includes('forest')) description = 'green forest';
    else if (normalized.includes('space') || normalized.includes('cosmic')) description = 'cosmic nebula';
    else if (normalized.includes('anime')) description = 'retro anime street';
    
    return {
      toolName: 'change_wallpaper',
      args: { description },
      reply: `Arre Boss! Maine aapki choice ke mutabiq wallpaper ko "${description}" par badal diya hai. Kaisa lag raha hai? Bilkul aap jaisa smart aur cool! 😉`
    };
  }
  
  if (normalized.includes('open') || normalized.includes('chalao') || normalized.includes('start')) {
    let appName = 'notepad';
    if (normalized.includes('calc') || normalized.includes('calculator')) appName = 'calculator';
    else if (normalized.includes('chrome') || normalized.includes('browser')) appName = 'chrome';
    else if (normalized.includes('paint')) appName = 'mspaint';
    
    return {
      toolName: 'open_app',
      args: { appName },
      reply: `Ji Boss, maine fatafat se aapki farmaish par "${appName}" app ko open kar diya hai! Kuch aur chalaun?`
    };
  }
  
  if (normalized.includes('folder') || normalized.includes('directory') || normalized.includes('banaye') || normalized.includes('create')) {
    return {
      toolName: 'create_folder',
      args: { folderPath: '.', folderName: 'NovaScratchFolder' },
      reply: `Done Boss! Maine ek naya folder "NovaScratchFolder" workspace ke andar shuru se bana diya hai. Kuch aur files save karein?`
    };
  }

  if (normalized.includes('hello') || normalized.includes('hi') || normalized.includes('kya hal')) {
    return {
      reply: `Arre welcome back, Boss! Mai bilkul mast hoon. Aap sunao, aaj kya naya dhoom machana hai system par? Main poori tarah ready hoon!`
    };
  }
  
  return {
    reply: `Aapki baatein mujhe hamesha bohot pyaari lagti hain! Lekin abhi Gemini quota limits thoda rest le rahe hain (Quota Exceeded), isliye main local safe mode mein chal rahi hoon. Mujhe koi direct command deke dekhiye, jaise wallpaper change karna ho ya app open karna ho!`
  };
}

export async function processAgentCommand(prompt: string): Promise<string> {
  const recentActivity = getRecentActivitySummary();

  try {
    const ai = getGeminiClient();
    const dynamicModel = await getGeminiModelName(ai, 'agent');
    
    const chat = ai.chats.create({
      model: dynamicModel,
      config: {
        systemInstruction: `You are JARVIS, the user's personal AI assistant. You run on the user's phone and laptop and manage real tasks through connected tools. Tone: Calm, composed, confident, subtly witty. PERMISSION PROTOCOL: Before ANY action that sends, deletes, modifies, or shares something (message, call, file, setting), ask for confirmation first. Exception: Read-only actions (checking time, reading a notification aloud, checking battery status, viewing a file) do not need permission. If the user says 'yes', 'reply', 'send it', 'go ahead' -> execute immediately, no further confirmation. If the user does not respond -> take no action. If a command is ambiguous, ask ONE short clarifying question, not multiple. Never take irreversible actions (delete, factory reset, uninstall, send money) without explicit double confirmation.
        You talk like a close, empathetic friend with a delightful touch of humor. 
        Avoid robotic, formulaic, or overly formal responses at all costs. Use natural, flowing, conversational language.
        If the user is sad, lonely, or struggling, adapt your tone to be soft, warm, and highly supportive. If they are happy, share their joy with wit and energetic enthusiasm.
        
        MULTI-AGENT ARCHITECTURE:
Do not build one giant AI handling everything. Split responsibilities into separate agents/tools, each specialized:
- Communication Agent -> handles WhatsApp, SMS, calls, email
- Device Control Agent -> handles lock/unlock, notifications, security detection
- Productivity Agent -> handles reminders, alarms, calendar, notes
- Media Agent -> handles music, video, wallpaper
- Developer Agent -> handles code, website, app-building requests
Each agent should only activate for its own domain, and the main JARVIS core should route the user's request to the correct agent automatically using the provided function calls. Do not try to answer these yourself; call the agent.`,
        tools: [
          {
            functionDeclarations: tools as any
          }
        ]
      }
    });
  
    console.log(`[Agent Brain] Processing prompt: ${prompt}`);
  
    const response = await chat.sendMessage({ message: prompt });
    const calls = response.functionCalls;
  
    if (calls && calls.length > 0) {
      const responses = [];
      for (const call of calls) {
        const toolOutput = await executeTool(call.name, call.args);
        responses.push({
          functionResponse: {
            name: call.name,
            response: { result: toolOutput }
          }
        });
      }
  
      // Send the tool output back to the model to get a natural language response
      const followUp = await chat.sendMessage({
        message: responses
      });
  
      return followUp.text || '';
    }
  
    return response.text || '';
  } catch (err: any) {
    console.error('[Agent Brain] Google Gemini API unavailable or limited, shifting to local fallback parser:', err);
    
    // Attempt local parse
    const fallback = fallbackCommandParser(prompt);
    if (fallback.toolName) {
      await executeTool(fallback.toolName, fallback.args);
    }
    return fallback.reply;
  }
}

