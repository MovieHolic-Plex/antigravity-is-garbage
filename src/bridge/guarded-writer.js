import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { validateOutputPath } from '../shared/output-policy.js';

export class GuardedWriter {
  constructor(projectRoot) {
    this.projectRoot = path.resolve(projectRoot);
    this.blockedActions = [];
  }

  async writeText(relativePath, content) {
    return this.#write(relativePath, Buffer.from(content, 'utf8'));
  }

  async writeBuffer(relativePath, content) {
    return this.#write(relativePath, content);
  }

  async clearOutputs() {
    await rm(path.resolve(this.projectRoot, 'outputs'), { recursive: true, force: true });
    this.blockedActions = [];
  }

  async #write(relativePath, content) {
    const validation = validateOutputPath(this.projectRoot, relativePath);

    if (!validation.ok) {
      const blocked = {
        relativePath,
        reason: validation.reason,
        extension: validation.extension
      };
      this.blockedActions.push(blocked);
      throw new Error(`Blocked output write: ${validation.reason} (${relativePath})`);
    }

    await mkdir(path.dirname(validation.absolutePath), { recursive: true });
    await writeFile(validation.absolutePath, content);

    return {
      relativePath,
      absolutePath: validation.absolutePath,
      extension: validation.extension
    };
  }
}
