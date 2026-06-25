/**
 * FileService - wrapper around expo-file-system for local file operations.
 * Uses the classic async API from expo-file-system (compatible with Expo 52).
 * The workspace is stored in the app's document directory.
 */

import * as FileSystem from 'expo-file-system';
import { FileNode } from '../types';
import { detectLanguage } from '../utils/languageDetection';

const WORKSPACE_NAME = 'workspace';

/**
 * Get the workspace directory URI.
 */
function getWorkspaceUri(): string {
  return `${FileSystem.documentDirectory}${WORKSPACE_NAME}/`;
}

/**
 * Get the full URI for a relative path within the workspace.
 */
function getFileUri(relativePath: string): string {
  return `${getWorkspaceUri()}${relativePath}`;
}

/**
 * Ensure the workspace directory exists.
 */
async function ensureWorkspaceDir(): Promise<void> {
  const uri = getWorkspaceUri();
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
  }
}

/**
 * Ensure parent directory exists for a given file path.
 */
async function ensureParentDir(relativePath: string): Promise<void> {
  const parts = relativePath.split('/');
  if (parts.length > 1) {
    const parentPath = parts.slice(0, -1).join('/');
    const parentUri = getFileUri(parentPath);
    const info = await FileSystem.getInfoAsync(parentUri);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(parentUri, { intermediates: true });
    }
  }
}

/**
 * List directory contents recursively, building a FileNode tree.
 */
async function listDirectory(relativePath: string = ''): Promise<FileNode[]> {
  await ensureWorkspaceDir();
  const dirUri = relativePath ? getFileUri(relativePath) : getWorkspaceUri();

  const info = await FileSystem.getInfoAsync(dirUri);
  if (!info.exists || !info.isDirectory) {
    return [];
  }

  const entries = await FileSystem.readDirectoryAsync(dirUri);
  const nodes: FileNode[] = [];

  const sorted = entries.sort((a, b) => a.localeCompare(b));

  for (const entryName of sorted) {
    const entryRelPath = relativePath ? `${relativePath}/${entryName}` : entryName;
    const entryUri = getFileUri(entryRelPath);
    const entryInfo = await FileSystem.getInfoAsync(entryUri);

    if (entryInfo.isDirectory) {
      const children = await listDirectory(entryRelPath);
      nodes.push({
        id: entryRelPath,
        name: entryName,
        path: entryRelPath,
        type: 'directory',
        children,
      });
    } else {
      nodes.push({
        id: entryRelPath,
        name: entryName,
        path: entryRelPath,
        type: 'file',
        language: detectLanguage(entryName),
        lastModified: entryInfo.exists ? (entryInfo as { modificationTime?: number }).modificationTime : undefined,
      });
    }
  }

  // Sort: directories first, then files
  nodes.sort((a, b) => {
    if (a.type === 'directory' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

/**
 * Read file content.
 */
async function readFile(relativePath: string): Promise<string> {
  const uri = getFileUri(relativePath);
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error(`File not found: ${relativePath}`);
  }
  return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
}

/**
 * Write content to a file. Creates parent directories if needed.
 */
async function writeFile(relativePath: string, content: string): Promise<void> {
  await ensureWorkspaceDir();
  await ensureParentDir(relativePath);
  const uri = getFileUri(relativePath);
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
}

/**
 * Create a new file with optional initial content.
 */
async function createFile(relativePath: string, content: string = ''): Promise<void> {
  await ensureWorkspaceDir();
  const uri = getFileUri(relativePath);
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    throw new Error(`File already exists: ${relativePath}`);
  }
  await ensureParentDir(relativePath);
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
}

/**
 * Create a new directory.
 */
async function createDirectory(relativePath: string): Promise<void> {
  await ensureWorkspaceDir();
  const uri = getFileUri(relativePath);
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    throw new Error(`Directory already exists: ${relativePath}`);
  }
  await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
}

/**
 * Delete a file or directory.
 */
async function deleteItem(relativePath: string): Promise<void> {
  const uri = getFileUri(relativePath);
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error(`Item not found: ${relativePath}`);
  }
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

/**
 * Rename (move) a file or directory.
 */
async function renameFile(oldRelativePath: string, newRelativePath: string): Promise<void> {
  const oldUri = getFileUri(oldRelativePath);
  const newUri = getFileUri(newRelativePath);

  const oldInfo = await FileSystem.getInfoAsync(oldUri);
  if (!oldInfo.exists) {
    throw new Error(`Item not found: ${oldRelativePath}`);
  }

  const newInfo = await FileSystem.getInfoAsync(newUri);
  if (newInfo.exists) {
    throw new Error(`Destination already exists: ${newRelativePath}`);
  }

  await ensureParentDir(newRelativePath);
  await FileSystem.moveAsync({ from: oldUri, to: newUri });
}

/**
 * Check if a file or directory exists.
 */
async function exists(relativePath: string): Promise<boolean> {
  const uri = getFileUri(relativePath);
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists;
}

/**
 * Get the workspace directory URI.
 */
function getWorkspaceDir(): string {
  return getWorkspaceUri();
}

export const FileService = {
  ensureWorkspaceDir,
  listDirectory,
  readFile,
  writeFile,
  createFile,
  createDirectory,
  deleteFile: deleteItem,
  renameFile,
  exists,
  getWorkspaceDir,
};
