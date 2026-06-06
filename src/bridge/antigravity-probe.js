import { access } from 'node:fs/promises';
import { DEFAULT_AGY_PATH } from './agy-client.js';

export async function probeAntigravity(commandPath = DEFAULT_AGY_PATH) {
  try {
    await access(commandPath);
    return {
      available: true,
      commandPath,
      mode: 'agy-print-guarded-image-md-bridge'
    };
  } catch {
    return {
      available: false,
      commandPath,
      mode: 'agy-print-guarded-image-md-bridge'
    };
  }
}
