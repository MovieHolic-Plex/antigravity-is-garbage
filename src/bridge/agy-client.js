import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const DEFAULT_AGY_PATH = '/home/main/.local/bin/agy';

export function buildAgyPrompt({ userPrompt, variants, screenCount }) {
  return `Return Markdown only. Image-only UI mockup plan for: ${userPrompt}. Sections: Visual Direction, Layout, Image Prompt.`;
}

export function runAgyPlanning({
  commandPath = DEFAULT_AGY_PATH,
  userPrompt,
  variants,
  screenCount,
  timeoutMs = 60000
}) {
  const prompt = buildAgyPrompt({ userPrompt, variants, screenCount });

  return runAgyViaOutputFile({ commandPath, prompt, timeoutMs });
}

async function runAgyViaOutputFile({ commandPath, prompt, timeoutMs }) {
  const directory = await mkdtemp(path.join(tmpdir(), 'aigg-agy-'));
  const stdoutPath = path.join(directory, 'agy-output.md');
  const stderrPath = path.join(directory, 'agy-error.log');
  const printTimeout = `${Math.ceil(timeoutMs / 1000)}s`;
  const command = `${shellQuote(commandPath)} --print-timeout=${shellQuote(printTimeout)} --print ${shellQuote(prompt)} > ${shellQuote(stdoutPath)} 2> ${shellQuote(stderrPath)}`;

  try {
    const result = await new Promise((resolve) => {
      const child = spawn('bash', ['-lc', command], { cwd: directory, stdio: 'ignore' });
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({ ok: false, reason: 'timeout' });
      }, timeoutMs);

      child.on('exit', (code, signal) => {
        clearTimeout(timer);
        resolve({
          ok: code === 0,
          reason: code === 0 ? undefined : signal === 'SIGTERM' ? 'timeout' : 'agy_failed',
          code,
          signal
        });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        resolve({ ok: false, reason: 'agy_failed', error });
      });
    });

    const stdout = await readFile(stdoutPath, 'utf8').catch(() => '');
    const stderr = await readFile(stderrPath, 'utf8').catch(() => '');
    const markdown = stdout.trim();

    if (!result.ok) {
      return {
        ok: false,
        commandPath,
        reason: result.reason,
        stderr: stderr.trim() || result.error?.message || `agy exited with code ${result.code ?? 'unknown'}`
      };
    }

    if (!markdown) {
      return {
        ok: false,
        commandPath,
        reason: 'empty_response',
        stderr: stderr.trim()
      };
    }

    return {
      ok: true,
      commandPath,
      markdown
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function shellQuote(value) {
  return JSON.stringify(String(value));
}
