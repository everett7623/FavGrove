import type { BookmarkNode, ScanResult } from '../types';
import { flattenBookmarks, flattenFolders, getBookmarkNodeCapabilities } from './bookmarks';

function findDuplicateBookmarkGroups(bookmarks: BookmarkNode[]): BookmarkNode[][] {
  const byUrl = new Map<string, BookmarkNode[]>();

  for (const bookmark of bookmarks) {
    if (!bookmark.url) continue;
    byUrl.set(bookmark.url, [...(byUrl.get(bookmark.url) ?? []), bookmark]);
  }

  return [...byUrl.values()].filter((group) => group.length > 1);
}

function findDuplicateFolderGroups(folders: BookmarkNode[]): BookmarkNode[][] {
  const byParentAndTitle = new Map<string, BookmarkNode[]>();

  for (const folder of folders) {
    const key = `${folder.parentId ?? 'root'}::${folder.title.trim().toLowerCase()}`;
    byParentAndTitle.set(key, [...(byParentAndTitle.get(key) ?? []), folder]);
  }

  return [...byParentAndTitle.values()].filter((group) => group.length > 1);
}

function findEmptyFolders(folders: BookmarkNode[]): BookmarkNode[] {
  return folders.filter((folder) => (folder.children ?? []).length === 0);
}

export function createStructureScanResult(bookmarks: BookmarkNode[]): ScanResult {
  const capabilities = getBookmarkNodeCapabilities(bookmarks);
  const flatBookmarks = flattenBookmarks(bookmarks).filter((bookmark) => capabilities.get(bookmark.id)?.canMutate !== false);
  const folders = flattenFolders(bookmarks).filter((folder) => capabilities.get(folder.id)?.canMutate === true);

  return {
    duplicateBookmarkGroups: findDuplicateBookmarkGroups(flatBookmarks),
    duplicateFolderGroups: findDuplicateFolderGroups(folders),
    emptyFolders: findEmptyFolders(folders),
    invalidLinks: []
  };
}
