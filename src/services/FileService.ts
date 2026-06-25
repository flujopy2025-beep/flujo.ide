/**
 * FileService - wrapper around expo-file-system for local file operations.
 * Uses the new class-based API (File, Directory, Paths) from expo-file-system.
 * The workspace is stored in the app's document directory.
 */

import { File, Directory, Paths } from 'expo-file-system';
import { FileNode } from '../types';
import { detectLanguage } from '../utils/languageDetection';

const WORKSPACE_NAME = 'workspace';

/**
 * Get the workspace directory instance.
 */
function getWorkspaceDirectory(): Directory {
  return new Directory(Paths.document, WORKSPACE_NAME);
}

/**
 * Ensure the workspace directory exists.
 */
function ensureWorkspaceDir(): void {
  const workspaceDir = getWorkspaceDirectory();
  if (!workspaceDir.exists) {
    workspaceDir.create();
  }
}

/**
 * Get a File instance for a relative path within the workspace.
 */
function getFile(relativePath: string): File {
  return new File(getWorkspaceDirectory(), relativePath);
}

/**
 * Get a Directory instance for a relative path within the workspace.
 */
function getDirectory(relativePath: string): Directory {
  if (!relativePath) {
    return getWorkspaceDirectory();
  }
  return new Directory(getWorkspaceDirectory(), relativePath);
}

/**
 * Extract relative path from a uri within the workspace.
 */
function getRelativePath(uri: string): string {
  const workspaceUri = getWorkspaceDirectory().uri;
  if (uri.startsWith(workspaceUri)) {
    return uri.slice(workspaceUri.length);
  }
  return uri;
}

/**
 * List directory contents recursively, building a FileNode tree.
 */
function listDirectory(relativePath: string = ''): FileNode[] {
  ensureWorkspaceDir();
  const dir = getDirectory(relativePath);

  if (!dir.exists) {
    return [];
  }

  const entries = dir.list();
  const nodes: FileNode[] = [];

  // Sort entries by name
  const sorted = entries.sort((a, b) => {
    const aName = a.name || '';
    const bName = b.name || '';
    return aName.localeCompare(bName);
  });

  for (const entry of sorted) {
    const entryName = entry.name || '';
    const entryRelPath = relativePath ? `${relativePath}/${entryName}` : entryName;

    if (entry instanceof Directory) {
      const children = listDirectory(entryRelPath);
      nodes.push({
        id: entryRelPath,
        name: entryName,
        path: entryRelPath,
        type: 'directory',
        children,
      });
    } else {
      const file = entry as File;
      nodes.push({
        id: entryRelPath,
        name: entryName,
        path: entryRelPath,
        type: 'file',
        language: detectLanguage(entryName),
        lastModified: file.lastModified ?? undefined,
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
  const file = getFile(relativePath);
  if (!file.exists) {
    throw new Error(`File not found: ${relativePath}`);
  }
  return await file.text();
}

/**
 * Write content to a file. Creates parent directories if needed.
 */
function writeFile(relativePath: string, content: string): void {
  ensureWorkspaceDir();

  // Ensure parent directory exists
  const parts = relativePath.split('/');
  if (parts.length > 1) {
    const parentPath = parts.slice(0, -1).join('/');
    const parentDir = getDirectory(parentPath);
    if (!parentDir.exists) {
      parentDir.create();
    }
  }

  const file = getFile(relativePath);
  if (!file.exists) {
    file.create();
  }
  file.write(content);
}

/**
 * Create a new file with optional initial content.
 */
function createFile(relativePath: string, content: string = ''): void {
  ensureWorkspaceDir();
  const file = getFile(relativePath);
  if (file.exists) {
    throw new Error(`File already exists: ${relativePath}`);
  }

  // Ensure parent directory exists
  const parts = relativePath.split('/');
  if (parts.length > 1) {
    const parentPath = parts.slice(0, -1).join('/');
    const parentDir = getDirectory(parentPath);
    if (!parentDir.exists) {
      parentDir.create();
    }
  }

  file.create();
  if (content) {
    file.write(content);
  }
}

/**
 * Create a new directory.
 */
function createDirectory(relativePath: string): void {
  ensureWorkspaceDir();
  const dir = getDirectory(relativePath);
  if (dir.exists) {
    throw new Error(`Directory already exists: ${relativePath}`);
  }
  dir.create();
}

/**
 * Delete a file or directory.
 */
function deleteItem(relativePath: string): void {
  const file = getFile(relativePath);
  if (file.exists) {
    file.delete();
    return;
  }
  const dir = getDirectory(relativePath);
  if (dir.exists) {
    dir.delete();
    return;
  }
  throw new Error(`Item not found: ${relativePath}`);
}

/**
 * Rename (move) a file or directory.
 */
async function renameFile(oldRelativePath: string, newRelativePath: string): Promise<void> {
  const oldFile = getFile(oldRelativePath);
  if (oldFile.exists) {
    const newFile = getFile(newRelativePath);
    if (newFile.exists) {
      throw new Error(`Destination already exists: ${newRelativePath}`);
    }
    await oldFile.move(newFile);
    return;
  }

  const oldDir = getDirectory(oldRelativePath);
  if (oldDir.exists) {
    const newDir = getDirectory(newRelativePath);
    if (newDir.exists) {
      throw new Error(`Destination already exists: ${newRelativePath}`);
    }
    await oldDir.move(newDir);
    return;
  }

  throw new Error(`Item not found: ${oldRelativePath}`);
}

/**
 * Check if a file or directory exists.
 */
function exists(relativePath: string): boolean {
  const file = getFile(relativePath);
  if (file.exists) return true;
  const dir = getDirectory(relativePath);
  return dir.exists;
}

/**
 * Get the workspace directory URI.
 */
function getWorkspaceDir(): string {
  return getWorkspaceDirectory().uri;
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
