import type { BookmarkNode, BookmarkRestoreItem } from '../types';
import { isSyntheticBookmarkRoot } from './bookmarks';

export interface FolderRestoreEntry {
  id: string;
  path: string[];
}

function visitTree(
  nodes: BookmarkNode[],
  onFolder: (folder: FolderRestoreEntry) => void,
  onBookmark: (bookmark: BookmarkRestoreItem) => void,
  parentPath: string[] = [],
  depth = 0
): void {
  for (const node of nodes) {
    if (node.url) {
      onBookmark({ title: node.title, url: node.url, path: parentPath, parentId: node.parentId });
      continue;
    }

    const syntheticRoot = depth === 0 && isSyntheticBookmarkRoot(node, nodes.length);
    const path = syntheticRoot ? parentPath : [...parentPath, node.title];
    if (!syntheticRoot) onFolder({ id: node.id, path });
    if (node.children) visitTree(node.children as BookmarkNode[], onFolder, onBookmark, path, depth + 1);
  }
}

export function collectFolderRestoreEntries(nodes: BookmarkNode[]): FolderRestoreEntry[] {
  const folders: FolderRestoreEntry[] = [];
  visitTree(nodes, (folder) => folders.push(folder), () => undefined);
  return folders;
}

export function collectBookmarkRestoreItems(nodes: BookmarkNode[]): BookmarkRestoreItem[] {
  const bookmarks: BookmarkRestoreItem[] = [];
  visitTree(nodes, () => undefined, (bookmark) => bookmarks.push(bookmark));
  return bookmarks;
}

function pathKey(path: string[], url: string): string {
  return JSON.stringify([path, url]);
}

function parentKey(parentId: string, url: string): string {
  return JSON.stringify([parentId, url]);
}

function addQueueValue(queues: Map<string, number[]>, key: string, value: number): void {
  const queue = queues.get(key) ?? [];
  queue.push(value);
  queues.set(key, queue);
}

function takeUnmatched(queue: number[] | undefined, matched: Set<number>): number | undefined {
  while (queue?.length) {
    const index = queue.pop();
    if (index !== undefined && !matched.has(index)) return index;
  }
  return undefined;
}

export function getMissingBookmarkRestoreItems(current: BookmarkNode[], snapshot: BookmarkNode[]): BookmarkRestoreItem[] {
  const currentItems = collectBookmarkRestoreItems(current);
  const currentFolderIds = new Set(collectFolderRestoreEntries(current).map((folder) => folder.id));
  const byParent = new Map<string, number[]>();
  const byPath = new Map<string, number[]>();
  const matched = new Set<number>();

  currentItems.forEach((item, index) => {
    if (item.parentId) addQueueValue(byParent, parentKey(item.parentId, item.url), index);
    addQueueValue(byPath, pathKey(item.path, item.url), index);
  });

  return collectBookmarkRestoreItems(snapshot).filter((item) => {
    const parentMatch = item.parentId && currentFolderIds.has(item.parentId)
      ? takeUnmatched(byParent.get(parentKey(item.parentId, item.url)), matched)
      : undefined;
    const match = parentMatch ?? takeUnmatched(byPath.get(pathKey(item.path, item.url)), matched);
    if (match === undefined) return true;
    matched.add(match);
    return false;
  });
}
