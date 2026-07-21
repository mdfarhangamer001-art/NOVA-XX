const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

const declarations = `
const agentDeclarations = [
  {
    name: 'communication_agent',
    description: 'Handles WhatsApp, SMS, calls, email.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: { type: 'STRING', description: 'e.g. send_whatsapp, make_call, send_email' },
        args: { type: 'STRING', description: 'JSON string of arguments' }
      },
      required: ['action', 'args']
    }
  },
  {
    name: 'device_control_agent',
    description: 'Handles lock/unlock, notifications, security detection.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: { type: 'STRING', description: 'e.g. lock_device, read_notifications' },
        args: { type: 'STRING', description: 'JSON string of arguments' }
      },
      required: ['action', 'args']
    }
  },
  {
    name: 'productivity_agent',
    description: 'Handles reminders, alarms, calendar, notes.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: { type: 'STRING', description: 'e.g. set_reminder, create_calendar_event, set_alarm' },
        args: { type: 'STRING', description: 'JSON string of arguments' }
      },
      required: ['action', 'args']
    }
  },
  {
    name: 'media_agent',
    description: 'Handles music, video, wallpaper.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: { type: 'STRING', description: 'e.g. set_wallpaper, play_music' },
        args: { type: 'STRING', description: 'JSON string of arguments' }
      },
      required: ['action', 'args']
    }
  },
  {
    name: 'developer_agent',
    description: 'Handles code, website, app-building requests.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: { type: 'STRING', description: 'e.g. write_code, build_website' },
        args: { type: 'STRING', description: 'JSON string of arguments' }
      },
      required: ['action', 'args']
    }
  }
];
`;

content = content.replace("const extractAndStoreMemoriesWeb", declarations + "\n          const extractAndStoreMemoriesWeb");

const toolConfig = `tools: [{ googleSearch: {} }, { functionDeclarations: agentDeclarations }]`;
content = content.replace(/tools: \[\{ googleSearch: \{\} \}\]/g, toolConfig);

fs.writeFileSync(file, content);
