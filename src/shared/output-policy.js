import path from 'node:path';

export const ALLOWED_EXTENSIONS = new Set(['.md', '.png', '.jpg', '.jpeg', '.webp']);

export function validateOutputPath(projectRoot, relativePath) {
  const outputRoot = path.resolve(projectRoot, 'outputs');
  const absolutePath = path.resolve(projectRoot, relativePath);
  const extension = path.extname(absolutePath).toLowerCase();

  if (!absolutePath.startsWith(`${outputRoot}${path.sep}`)) {
    return {
      ok: false,
      reason: 'outside_outputs',
      absolutePath,
      extension
    };
  }

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      reason: 'extension_not_allowed',
      absolutePath,
      extension
    };
  }

  return {
    ok: true,
    absolutePath,
    extension
  };
}

export function isImageExtension(extension) {
  return ['.png', '.jpg', '.jpeg', '.webp'].includes(extension.toLowerCase());
}
