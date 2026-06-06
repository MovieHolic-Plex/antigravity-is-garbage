import { access } from 'node:fs/promises';

export async function probeAntigravity(commandPath = '/usr/local/bin/antigravity') {
  try {
    await access(commandPath);
    return {
      available: true,
      commandPath,
      mode: 'guarded-image-md-bridge'
    };
  } catch {
    return {
      available: false,
      commandPath,
      mode: 'guarded-image-md-bridge'
    };
  }
}
