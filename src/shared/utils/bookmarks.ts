import { pinyin } from 'pinyin-pro';
import type { BookmarkNode, BookmarkStats, DeletedBookmarkNode, ScanResult } from '../types';

export type SortOption = 'default' | 'title-asc' | 'title-desc' | 'date-asc' | 'date-desc' | 'url-asc';

export interface BookmarkNodeCapabilities {
  permanentRoot: boolean;
  managed: boolean;
  canMutate: boolean;
  canAcceptChildren: boolean;
}

const cjkPattern = /[\u3400-\u9fff]/;

export function isSyntheticBookmarkRoot(node: BookmarkNode, siblingCount: number): boolean {
  return siblingCount === 1 && !node.parentId && !node.url && (node.id === '0' || !node.title.trim());
}

export function normalizeBookmarkTree(nodes: BookmarkNode[]): BookmarkNode[] {
  const [root] = nodes;
  if (!root || !isSyntheticBookmarkRoot(root, nodes.length)) return nodes;
  return (root.children as BookmarkNode[] | undefined) ?? [];
}

export function getBookmarkNodeCapabilities(nodes: BookmarkNode[]): Map<string, BookmarkNodeCapabilities> {
  const capabilities = new Map<string, BookmarkNodeCapabilities>();

  const visit = (currentNodes: BookmarkNode[], depth: number, managedAncestor: boolean) => {
    for (const node of currentNodes) {
      const permanentRoot = depth === 0 || node.folderType !== undefined;
      const managed = managedAncestor || node.unmodifiable === 'managed' || node.folderType === 'managed';
      capabilities.set(node.id, {
        permanentRoot,
        managed,
        canMutate: !permanentRoot && !managed,
        canAcceptChildren: !node.url && !managed
      });
      if (node.children) visit(node.children as BookmarkNode[], depth + 1, managed);
    }
  };

  visit(normalizeBookmarkTree(nodes), 0, false);
  return capabilities;
}

function annotateNodes(nodes: BookmarkNode[], parentPath: string[]): BookmarkNode[] {
  return nodes.map((node) => {
    const path = [...parentPath, node.title || 'Untitled'];
    return {
      ...node,
      path,
      children: node.children ? annotateNodes(node.children as BookmarkNode[], path) : undefined
    };
  });
}

export function annotateBookmarkPaths(nodes: BookmarkNode[], parentPath: string[] = []): BookmarkNode[] {
  return annotateNodes(normalizeBookmarkTree(nodes), parentPath);
}

export function flattenBookmarks(nodes: BookmarkNode[]): BookmarkNode[] {
  const items: BookmarkNode[] = [];

  const visit = (currentNodes: BookmarkNode[]) => {
    for (const node of currentNodes) {
      if (node.url) items.push(node);
      if (node.children) visit(node.children as BookmarkNode[]);
    }
  };

  visit(nodes);
  return items;
}

export function flattenFolders(nodes: BookmarkNode[]): BookmarkNode[] {
  const folders: BookmarkNode[] = [];

  const visit = (currentNodes: BookmarkNode[]) => {
    for (const node of currentNodes) {
      if (node.children) {
        folders.push(node);
        visit(node.children as BookmarkNode[]);
      }
    }
  };

  visit(nodes);
  return folders;
}

export function getVisibleFolders(nodes: BookmarkNode[], collapsedFolderIds: Set<string>): BookmarkNode[] {
  const folders: BookmarkNode[] = [];

  const visit = (currentNodes: BookmarkNode[]) => {
    for (const node of currentNodes) {
      if (!node.children) continue;
      folders.push(node);
      if (!collapsedFolderIds.has(node.id)) visit(node.children as BookmarkNode[]);
    }
  };

  visit(nodes);
  return folders;
}

export function getFolderIdsWithFolderChildren(nodes: BookmarkNode[]): Set<string> {
  const ids = new Set<string>();

  const visit = (currentNodes: BookmarkNode[]) => {
    for (const node of currentNodes) {
      if (!node.children) continue;
      if ((node.children as BookmarkNode[]).some((child) => child.children)) ids.add(node.id);
      visit(node.children as BookmarkNode[]);
    }
  };

  visit(nodes);
  return ids;
}

export function planDuplicateBookmarkCleanup(group: BookmarkNode[]): { keeper: BookmarkNode | null; duplicateIds: string[] } {
  const ordered = group
    .map((bookmark, index) => ({ bookmark, index }))
    .sort((left, right) => {
      const leftDate = left.bookmark.dateAdded ?? Number.MAX_SAFE_INTEGER;
      const rightDate = right.bookmark.dateAdded ?? Number.MAX_SAFE_INTEGER;
      return leftDate - rightDate || left.index - right.index;
    })
    .map(({ bookmark }) => bookmark);

  return {
    keeper: ordered[0] ?? null,
    duplicateIds: ordered.slice(1).map((bookmark) => bookmark.id)
  };
}

export function sortBookmarks(bookmarks: BookmarkNode[], sortBy: SortOption): BookmarkNode[] {
  if (sortBy === 'default') return bookmarks;

  const sorted = [...bookmarks];
  switch (sortBy) {
    case 'title-asc':
      return sorted.sort((left, right) => (left.title || '').localeCompare(right.title || ''));
    case 'title-desc':
      return sorted.sort((left, right) => (right.title || '').localeCompare(left.title || ''));
    case 'date-asc':
      return sorted.sort((left, right) => (left.dateAdded ?? 0) - (right.dateAdded ?? 0));
    case 'date-desc':
      return sorted.sort((left, right) => (right.dateAdded ?? 0) - (left.dateAdded ?? 0));
    case 'url-asc':
      return sorted.sort((left, right) => (left.url || '').localeCompare(right.url || ''));
  }
}

export function calculateBookmarkStats(bookmarks: BookmarkNode[], scanResult?: ScanResult | null): BookmarkStats {
  const flatBookmarks = flattenBookmarks(bookmarks);
  const folders = flattenFolders(bookmarks);
  const urls = new Map<string, number>();

  for (const bookmark of flatBookmarks) {
    if (!bookmark.url) continue;
    urls.set(bookmark.url, (urls.get(bookmark.url) ?? 0) + 1);
  }

  return {
    totalBookmarks: flatBookmarks.length,
    totalFolders: folders.length,
    duplicateBookmarks: [...urls.values()].filter((count) => count > 1).reduce((sum, count) => sum + count, 0),
    invalidLinks: scanResult?.invalidLinks.length ?? 0
  };
}

export function searchBookmarks(bookmarks: BookmarkNode[], query: string): BookmarkNode[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return flattenBookmarks(bookmarks);
  const compactQuery = normalized.replace(/\s+/g, '');

  return flattenBookmarks(bookmarks).filter((bookmark) => {
    const haystack = `${bookmark.title} ${bookmark.url ?? ''} ${bookmark.path?.join(' ') ?? ''}`.toLowerCase();
    if (haystack.includes(normalized)) return true;

    const pinyinSource = `${bookmark.title} ${bookmark.path?.join(' ') ?? ''}`;
    if (!cjkPattern.test(pinyinSource)) return false;

    const fullPinyin = pinyin(pinyinSource, { toneType: 'none' }).toLowerCase();
    const compactPinyin = fullPinyin.replace(/\s+/g, '');
    const initials = fullPinyin
      .split(/\s+/)
      .map((part) => part[0] ?? '')
      .join('');
    return fullPinyin.includes(normalized) || compactPinyin.includes(compactQuery) || initials.includes(compactQuery);
  });
}

export function removeBookmarkNodes(nodes: BookmarkNode[], ids: Set<string>): BookmarkNode[] {
  return nodes
    .filter((node) => !ids.has(node.id))
    .map((node) => ({
      ...node,
      children: node.children ? removeBookmarkNodes(node.children as BookmarkNode[], ids) : undefined
    }));
}

export function collectBookmarkNodesByIds(nodes: BookmarkNode[], ids: Set<string>): BookmarkNode[] {
  const found: BookmarkNode[] = [];

  const visit = (currentNodes: BookmarkNode[]) => {
    for (const node of currentNodes) {
      if (node.url && ids.has(node.id)) found.push(node);
      if (node.children) visit(node.children as BookmarkNode[]);
    }
  };

  visit(nodes);
  return found;
}

export function collectNodesByIds(nodes: BookmarkNode[], ids: Set<string>): BookmarkNode[] {
  const found: BookmarkNode[] = [];

  const visit = (currentNodes: BookmarkNode[]) => {
    for (const node of currentNodes) {
      if (ids.has(node.id)) found.push(node);
      if (node.children) visit(node.children as BookmarkNode[]);
    }
  };

  visit(nodes);
  return found;
}

export function indexBookmarkNodes(nodes: BookmarkNode[]): Map<string, BookmarkNode> {
  const indexed = new Map<string, BookmarkNode>();
  const visit = (currentNodes: BookmarkNode[]) => {
    for (const node of currentNodes) {
      indexed.set(node.id, node);
      if (node.children) visit(node.children as BookmarkNode[]);
    }
  };
  visit(normalizeBookmarkTree(nodes));
  return indexed;
}

export function findBookmarkNode(nodes: BookmarkNode[], id: string): BookmarkNode | null {
  return indexBookmarkNodes(nodes).get(id) ?? null;
}

export function wouldCreateMoveCycle(nodes: BookmarkNode[], ids: Set<string>, targetId: string): boolean {
  const indexed = indexBookmarkNodes(nodes);
  let current = indexed.get(targetId);
  while (current) {
    if (ids.has(current.id)) return true;
    current = current.parentId ? indexed.get(current.parentId) : undefined;
  }
  return false;
}

export function planBookmarkDeletion(nodes: BookmarkNode[], ids: Set<string>): DeletedBookmarkNode[] | null {
  const capabilities = getBookmarkNodeCapabilities(nodes);
  const indexed = indexBookmarkNodes(nodes);
  const planned: DeletedBookmarkNode[] = [];

  for (const id of ids) {
    const node = indexed.get(id);
    const access = capabilities.get(id);
    if (!node?.parentId || !access?.canMutate) return null;
    if (!node.url && (node.children?.length ?? 0) > 0) return null;
    planned.push({
      oldId: node.id,
      parentId: node.parentId,
      index: node.index,
      title: node.title,
      url: node.url,
      tags: node.tags ?? []
    });
  }

  return planned.sort((left, right) => left.parentId.localeCompare(right.parentId) || (left.index ?? 0) - (right.index ?? 0));
}

export function insertBookmarkNodes(nodes: BookmarkNode[], parentId: string, inserted: BookmarkNode[]): BookmarkNode[] {
  return nodes.map((node) => ({
    ...node,
    children:
      node.id === parentId && node.children
        ? [...(node.children as BookmarkNode[]), ...inserted]
        : node.children
          ? insertBookmarkNodes(node.children as BookmarkNode[], parentId, inserted)
          : undefined
  }));
}

export function restoreDeletedBookmarkNodes(
  nodes: BookmarkNode[],
  deleted: DeletedBookmarkNode[],
  idMap: Record<string, string>
): BookmarkNode[] {
  let restored = nodes;
  for (const item of deleted) {
    const restoredNode: BookmarkNode = {
      id: idMap[item.oldId] ?? item.oldId,
      title: item.title,
      parentId: item.parentId,
      index: item.index,
      url: item.url,
      tags: item.tags,
      children: item.url ? undefined : []
    };
    const insert = (currentNodes: BookmarkNode[]): BookmarkNode[] =>
      currentNodes.map((node) => {
        if (node.id === item.parentId && node.children) {
          const children = [...(node.children as BookmarkNode[])];
          children.splice(Math.min(item.index ?? children.length, children.length), 0, restoredNode);
          return { ...node, children };
        }
        return { ...node, children: node.children ? insert(node.children as BookmarkNode[]) : undefined };
      });
    restored = insert(restored);
  }
  return restored;
}

export function isDescendantNode(nodes: BookmarkNode[], ancestorId: string, targetId: string): boolean {
  const findAncestor = (currentNodes: BookmarkNode[]): BookmarkNode | null => {
    for (const node of currentNodes) {
      if (node.id === ancestorId) return node;
      if (node.children) {
        const found = findAncestor(node.children as BookmarkNode[]);
        if (found) return found;
      }
    }
    return null;
  };

  const ancestor = findAncestor(nodes);
  if (!ancestor?.children) return false;
  return collectNodesByIds(ancestor.children as BookmarkNode[], new Set([targetId])).length > 0;
}

export function updateBookmarkNodeTitle(nodes: BookmarkNode[], id: string, title: string): BookmarkNode[] {
  return nodes.map((node) => ({
    ...node,
    title: node.id === id ? title : node.title,
    children: node.children ? updateBookmarkNodeTitle(node.children as BookmarkNode[], id, title) : undefined
  }));
}

export function updateBookmarkNodeUrl(nodes: BookmarkNode[], id: string, url: string): BookmarkNode[] {
  return nodes.map((node) => ({
    ...node,
    url: node.id === id ? url : node.url,
    children: node.children ? updateBookmarkNodeUrl(node.children as BookmarkNode[], id, url) : undefined
  }));
}

export function moveBookmarkNodes(nodes: BookmarkNode[], ids: Set<string>, targetFolderId: string): BookmarkNode[] {
  if (wouldCreateMoveCycle(nodes, ids, targetFolderId)) return nodes;
  const moving = collectNodesByIds(nodes, ids)
    .filter((node) => node.id !== targetFolderId)
    .map((node) => ({ ...node, parentId: targetFolderId }));
  if (moving.length === 0) return nodes;

  const movingIds = new Set(moving.map((node) => node.id));
  const withoutMoving = removeBookmarkNodes(nodes, movingIds);

  const appendToFolder = (currentNodes: BookmarkNode[]): BookmarkNode[] =>
    currentNodes.map((node) => {
      if (node.id === targetFolderId && node.children) {
        return {
          ...node,
          children: [...(node.children as BookmarkNode[]), ...moving]
        };
      }

      return {
        ...node,
        children: node.children ? appendToFolder(node.children as BookmarkNode[]) : undefined
      };
    });

  return appendToFolder(withoutMoving);
}

export function reorderNodeBefore(nodes: BookmarkNode[], nodeId: string, beforeId: string): BookmarkNode[] {
  const reorderSiblings = (siblings: BookmarkNode[]): BookmarkNode[] => {
    const fromIndex = siblings.findIndex((node) => node.id === nodeId);
    const toIndex = siblings.findIndex((node) => node.id === beforeId);
    if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
      const next = [...siblings];
      const [moving] = next.splice(fromIndex, 1);
      const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
      next.splice(adjustedToIndex, 0, moving);
      return next.map((node, index) => ({ ...node, index }));
    }

    return siblings.map((node) => ({
      ...node,
      children: node.children ? reorderSiblings(node.children as BookmarkNode[]) : undefined
    }));
  };

  return reorderSiblings(nodes);
}

export function mergeFolderNodes(nodes: BookmarkNode[], sourceIds: Set<string>, targetId: string): BookmarkNode[] {
  const sources = collectNodesByIds(nodes, sourceIds).filter((node) => node.children && node.id !== targetId);
  const childrenToMove = sources.flatMap((folder) =>
    ((folder.children as BookmarkNode[] | undefined) ?? []).map((child) => ({ ...child, parentId: targetId }))
  );
  if (childrenToMove.length === 0 && sources.length === 0) return nodes;

  const withoutSources = removeBookmarkNodes(nodes, new Set(sources.map((folder) => folder.id)));
  const appendChildren = (currentNodes: BookmarkNode[]): BookmarkNode[] =>
    currentNodes.map((node) => ({
      ...node,
      children:
        node.id === targetId && node.children
          ? [...(node.children as BookmarkNode[]), ...childrenToMove]
          : node.children
            ? appendChildren(node.children as BookmarkNode[])
            : undefined
    }));

  return appendChildren(withoutSources);
}

export function findNodeParent(nodes: BookmarkNode[], id: string): { parentId?: string; index: number } | null {
  const visit = (currentNodes: BookmarkNode[], parentId?: string): { parentId?: string; index: number } | null => {
    for (let index = 0; index < currentNodes.length; index += 1) {
      const node = currentNodes[index];
      if (node.id === id) return { parentId, index };
      if (node.children) {
        const found = visit(node.children as BookmarkNode[], node.id);
        if (found) return found;
      }
    }
    return null;
  };

  return visit(nodes);
}

export function getFolderDescendantBookmarks(nodes: BookmarkNode[], folderId: string | null): BookmarkNode[] {
  if (!folderId) return flattenBookmarks(nodes);

  const findFolder = (currentNodes: BookmarkNode[]): BookmarkNode | null => {
    for (const node of currentNodes) {
      if (node.id === folderId) return node;
      if (node.children) {
        const found = findFolder(node.children as BookmarkNode[]);
        if (found) return found;
      }
    }
    return null;
  };

  const folder = findFolder(nodes);
  return folder?.children ? flattenBookmarks(folder.children as BookmarkNode[]) : [];
}
