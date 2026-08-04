import { create } from 'zustand';
import { backupRestoreService } from '../services/backupRestoreService';
import { backupService } from '../services/backupService';
import { bookmarkService } from '../services/bookmarkService';
import { storageService } from '../services/storageService';
import i18n from '../shared/i18n';
import { STORAGE_KEYS } from '../shared/constants/storage';
import type {
  BackupRecord,
  BookmarkNode,
  BookmarkStats,
  DeletedBookmarkNode,
  ImportConflictStrategy,
  ImportPreview,
  RecentActivity,
  Result
} from '../shared/types';
import {
  annotateBookmarkPaths,
  calculateBookmarkStats,
  findNodeParent,
  indexBookmarkNodes,
  mergeFolderNodes,
  moveBookmarkNodes,
  planBookmarkDeletion,
  reorderNodeBefore,
  removeBookmarkNodes,
  restoreDeletedBookmarkNodes,
  searchBookmarks,
  updateBookmarkNodeTitle,
  updateBookmarkNodeUrl,
  wouldCreateMoveCycle
} from '../shared/utils/bookmarks';

type DeletedSnapshot = {
  items: DeletedBookmarkNode[];
};

interface BookmarkStore {
  bookmarks: BookmarkNode[];
  searchQuery: string;
  searchResults: BookmarkNode[];
  recentSearches: string[];
  recentActivities: RecentActivity[];
  backups: BackupRecord[];
  tagsByBookmarkId: Record<string, string[]>;
  tagFilter: string | null;
  lastDeletedSnapshot: DeletedSnapshot | null;
  stats: BookmarkStats;
  loading: boolean;
  mutating: boolean;
  error: string | null;
  load: () => Promise<void>;
  loadBackups: () => Promise<void>;
  setSearchQuery: (query: string) => Promise<void>;
  deleteBookmarks: (ids: string[]) => Promise<Result<number>>;
  renameBookmark: (id: string, title: string) => Promise<Result<void>>;
  updateBookmarkUrl: (id: string, url: string) => Promise<Result<void>>;
  renameFolder: (id: string, title: string) => Promise<Result<void>>;
  moveBookmarks: (ids: string[], parentId: string) => Promise<Result<number>>;
  moveFolders: (ids: string[], parentId: string) => Promise<Result<number>>;
  mergeFolders: (sourceIds: string[], targetId: string) => Promise<Result<number>>;
  reorderBookmarkBefore: (id: string, beforeId: string) => Promise<Result<void>>;
  undoLastDelete: () => Promise<Result<number>>;
  setBookmarkTags: (id: string, tags: string[]) => Promise<void>;
  updateBookmarkTags: (ids: string[], tags: string[], mode: 'add' | 'remove') => Promise<void>;
  setTagFilter: (tag: string | null) => void;
  importBookmarks: (preview: ImportPreview, strategy: ImportConflictStrategy, targetParentId: string) => Promise<Result<number>>;
  restoreBackup: (id: string) => Promise<Result<number>>;
  deleteBackup: (id: string) => Promise<Result<void>>;
  addActivity: (activity: Omit<RecentActivity, 'id' | 'createdAt'>) => Promise<void>;
}

function createActivity(activity: Omit<RecentActivity, 'id' | 'createdAt'>): RecentActivity {
  return {
    ...activity,
    id: crypto.randomUUID(),
    createdAt: Date.now()
  };
}

async function saveSearchHistory(recentSearches: string[]) {
  await storageService.set(STORAGE_KEYS.searchHistory, recentSearches);
}

async function saveActivities(recentActivities: RecentActivity[]) {
  await storageService.set(STORAGE_KEYS.recentActivities, recentActivities);
}

async function saveTags(tagsByBookmarkId: Record<string, string[]>) {
  return storageService.set(STORAGE_KEYS.bookmarkTags, tagsByBookmarkId);
}

async function getBackupListFallback(fallback: BackupRecord[]): Promise<BackupRecord[]> {
  const backups = await backupService.list();
  return backups.success ? backups.data : fallback;
}

function withLocalTags(bookmarks: BookmarkNode[], tagsByBookmarkId: Record<string, string[]>): BookmarkNode[] {
  return bookmarks.map((bookmark) => ({
    ...bookmark,
    tags: bookmark.url ? tagsByBookmarkId[bookmark.id] ?? [] : bookmark.tags,
    children: bookmark.children ? withLocalTags(bookmark.children as BookmarkNode[], tagsByBookmarkId) : undefined
  }));
}

function applyBookmarks(bookmarks: BookmarkNode[], query: string, tagsByBookmarkId: Record<string, string[]>, tagFilter: string | null) {
  const taggedBookmarks = annotateBookmarkPaths(withLocalTags(bookmarks, tagsByBookmarkId));
  const searchResults = searchBookmarks(taggedBookmarks, query).filter((bookmark) => !tagFilter || bookmark.tags?.includes(tagFilter));

  return {
    bookmarks: taggedBookmarks,
    searchResults,
    stats: calculateBookmarkStats(taggedBookmarks)
  };
}

async function readBookmarkTruth(fallback: BookmarkNode[]): Promise<Result<BookmarkNode[]>> {
  if (!bookmarkService.usesChromeApi()) return { success: true, data: fallback };
  return bookmarkService.getTree();
}

export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  bookmarks: [],
  searchQuery: '',
  searchResults: [],
  recentSearches: [],
  recentActivities: [],
  backups: [],
  tagsByBookmarkId: {},
  tagFilter: null,
  lastDeletedSnapshot: null,
  stats: { totalBookmarks: 0, totalFolders: 0, duplicateBookmarks: 0, invalidLinks: 0 },
  loading: false,
  mutating: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    const [storedSearches, storedActivities, storedTags] = await Promise.all([
      storageService.get<string[]>(STORAGE_KEYS.searchHistory),
      storageService.get<RecentActivity[]>(STORAGE_KEYS.recentActivities),
      storageService.get<Record<string, string[]>>(STORAGE_KEYS.bookmarkTags)
    ]);
    const storedBackups = await backupService.list();
    const result = await bookmarkService.getTree();
    if (!result.success) {
      set({ error: result.error, loading: false });
      return;
    }

    const tagsByBookmarkId = storedTags.success ? (storedTags.data?.data ?? {}) : {};
    const bookmarks = applyBookmarks(result.data, '', tagsByBookmarkId, get().tagFilter).bookmarks;
    const recentSearches = storedSearches.success ? (storedSearches.data?.data ?? []).slice(0, 10) : [];
    const recentActivities = storedActivities.success ? (storedActivities.data?.data ?? []).slice(0, 10) : [];
    set({
      bookmarks,
      searchResults: searchBookmarks(bookmarks, ''),
      stats: calculateBookmarkStats(bookmarks),
      recentSearches,
      recentActivities,
      backups: storedBackups.success ? storedBackups.data : [],
      tagsByBookmarkId,
      loading: false
    });
    await get().addActivity({
      type: 'load',
      messageKey: 'activity.loadedBookmarks',
      messageValues: { count: calculateBookmarkStats(bookmarks).totalBookmarks }
    });
  },
  loadBackups: async () => {
    const backups = await backupService.list();
    if (!backups.success) {
      set({ error: backups.error });
      return;
    }
    set({ backups: backups.data });
  },
  setSearchQuery: async (query) => {
    let nextSearches: string[] = [];
    set((state) => {
      const trimmed = query.trim();
      const recentSearches = trimmed
        ? [trimmed, ...state.recentSearches.filter((item) => item !== trimmed)].slice(0, 10)
        : state.recentSearches;
      nextSearches = recentSearches;

      return {
        searchQuery: query,
        searchResults: searchBookmarks(state.bookmarks, query).filter((bookmark) => !state.tagFilter || bookmark.tags?.includes(state.tagFilter)),
        recentSearches
      };
    });
    const trimmed = query.trim();
    if (trimmed) {
      await saveSearchHistory(nextSearches);
      await get().addActivity({ type: 'search', messageKey: 'activity.searched', messageValues: { query: trimmed } });
    }
  },
  deleteBookmarks: async (ids) => {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return { success: true, data: 0 };

    set({ mutating: true, error: null });
    const currentBookmarks = get().bookmarks;
    const idsSet = new Set(uniqueIds);
    const planned = planBookmarkDeletion(currentBookmarks, idsSet);
    if (!planned) {
      const error = i18n.t('serviceErrors.unsupportedBookmarkDelete');
      set({ error, mutating: false });
      return { success: false, error };
    }
    const backup = await backupService.create(currentBookmarks, 'delete');
    if (!backup.success) {
      set({ error: backup.error, mutating: false });
      return backup;
    }
    set((state) => ({ backups: [backup.data, ...state.backups] }));

    const deleted = await bookmarkService.removeMany(uniqueIds, currentBookmarks);
    const removedIds = new Set(deleted.success ? deleted.data : []);
    const truth = await readBookmarkTruth(removeBookmarkNodes(currentBookmarks, removedIds));
    if (!truth.success) {
      set({ error: truth.error, mutating: false });
      return truth;
    }

    const refreshedBackups = await getBackupListFallback(get().backups);
    const truthById = indexBookmarkNodes(truth.data);
    const remainingItems = planned.filter((item) => !truthById.has(item.oldId));
    const nextTags = { ...get().tagsByBookmarkId };
    for (const item of remainingItems) delete nextTags[item.oldId];
    const tagsSaved = await saveTags(nextTags);
    const operationError = !deleted.success ? deleted.error : !tagsSaved.success ? tagsSaved.error : null;
    const next = applyBookmarks(truth.data, get().searchQuery, nextTags, get().tagFilter);
    set({
      ...next,
      tagsByBookmarkId: nextTags,
      backups: refreshedBackups,
      lastDeletedSnapshot: remainingItems.length > 0 ? { items: remainingItems } : null,
      error: operationError,
      mutating: false
    });
    if (operationError) return { success: false, error: operationError };

    await get().addActivity({
      type: 'delete',
      messageKey: 'activity.deletedBookmarks',
      messageValues: { count: remainingItems.length, suffix: remainingItems.length === 1 ? '' : 's' }
    });
    return { success: true, data: remainingItems.length };
  },
  renameBookmark: async (id, title) => {
    const normalized = title.trim();
    if (!normalized) return { success: true, data: undefined };

    set({ mutating: true, error: null });
    const renamed = await bookmarkService.updateTitle(id, normalized, get().bookmarks);
    if (!renamed.success) {
      set({ error: renamed.error, mutating: false });
      return renamed;
    }

    set((state) => ({ ...applyBookmarks(updateBookmarkNodeTitle(state.bookmarks, id, normalized), state.searchQuery, state.tagsByBookmarkId, state.tagFilter), mutating: false }));
    await get().addActivity({ type: 'rename', messageKey: 'activity.renamedBookmark', messageValues: { title: normalized } });
    return { success: true, data: undefined };
  },
  updateBookmarkUrl: async (id, url) => {
    const normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      const error = i18n.t('errors.invalidBookmarkUrl');
      set({ error });
      return { success: false, error };
    }

    set({ mutating: true, error: null });
    const updated = await bookmarkService.updateUrl(id, normalized, get().bookmarks);
    if (!updated.success) {
      set({ error: updated.error, mutating: false });
      return updated;
    }

    set((state) => ({
      ...applyBookmarks(updateBookmarkNodeUrl(state.bookmarks, id, normalized), state.searchQuery, state.tagsByBookmarkId, state.tagFilter),
      mutating: false
    }));
    await get().addActivity({ type: 'rename', messageKey: 'activity.updatedBookmarkUrl', messageValues: { url: normalized } });
    return { success: true, data: undefined };
  },
  moveBookmarks: async (ids, parentId) => {
    const currentBookmarks = get().bookmarks;
    const movableIds = [...new Set(ids)].filter((id) => id !== parentId);
    if (movableIds.length === 0) return { success: true, data: 0 };
    if (wouldCreateMoveCycle(currentBookmarks, new Set(movableIds), parentId)) {
      const error = i18n.t('serviceErrors.invalidBookmarkTarget');
      set({ error });
      return { success: false, error };
    }

    set({ mutating: true, error: null });
    const moved = await bookmarkService.moveMany(movableIds, parentId, currentBookmarks);
    const fallback = moved.success ? moveBookmarkNodes(currentBookmarks, new Set(movableIds), parentId) : currentBookmarks;
    const truth = await readBookmarkTruth(fallback);
    if (!truth.success) {
      set({ error: truth.error, mutating: false });
      return truth;
    }
    set({ ...applyBookmarks(truth.data, get().searchQuery, get().tagsByBookmarkId, get().tagFilter), error: moved.success ? null : moved.error, mutating: false });
    if (!moved.success) return moved;

    await get().addActivity({
      type: 'move',
      messageKey: 'activity.movedItems',
      messageValues: { count: movableIds.length, suffix: movableIds.length === 1 ? '' : 's' }
    });
    return { success: true, data: movableIds.length };
  },
  renameFolder: async (id, title) => get().renameBookmark(id, title),
  moveFolders: async (ids, parentId) => get().moveBookmarks(ids, parentId),
  mergeFolders: async (sourceIds, targetId) => {
    const validSourceIds = [...new Set(sourceIds)].filter((id) => id !== targetId);
    if (validSourceIds.length === 0) return { success: true, data: 0 };

    set({ mutating: true, error: null });
    const currentBookmarks = get().bookmarks;
    const backup = await backupService.create(currentBookmarks, 'merge');
    if (!backup.success) {
      set({ error: backup.error, mutating: false });
      return backup;
    }
    set((state) => ({ backups: [backup.data, ...state.backups] }));

    const merged = await bookmarkService.mergeFolders(validSourceIds, targetId, currentBookmarks);
    const fallback = merged.success ? mergeFolderNodes(currentBookmarks, new Set(validSourceIds), targetId) : currentBookmarks;
    const truth = await readBookmarkTruth(fallback);
    if (!truth.success) {
      set({ error: truth.error, mutating: false });
      return truth;
    }
    const refreshedBackups = await getBackupListFallback(get().backups);
    set({
      ...applyBookmarks(truth.data, get().searchQuery, get().tagsByBookmarkId, get().tagFilter),
      backups: refreshedBackups,
      error: merged.success ? null : merged.error,
      mutating: false
    });
    if (!merged.success) return merged;

    await get().addActivity({
      type: 'merge',
      messageKey: 'activity.mergedFolders',
      messageValues: { count: validSourceIds.length, suffix: validSourceIds.length === 1 ? '' : 's' }
    });
    return { success: true, data: validSourceIds.length };
  },
  reorderBookmarkBefore: async (id, beforeId) => {
    if (id === beforeId) return { success: true, data: undefined };
    const currentBookmarks = get().bookmarks;
    const source = findNodeParent(currentBookmarks, id);
    const target = findNodeParent(currentBookmarks, beforeId);
    if (!target) return { success: true, data: undefined };
    const targetIndex = source !== null && source.parentId === target.parentId && source.index < target.index
      ? target.index - 1
      : target.index;

    set({ mutating: true, error: null });
    const moved = await bookmarkService.moveOne(id, target.parentId, targetIndex, currentBookmarks);
    if (!moved.success) {
      set({ error: moved.error, mutating: false });
      return moved;
    }

    set((state) => {
      const movedTree = source?.parentId === target.parentId || !target.parentId ? state.bookmarks : moveBookmarkNodes(state.bookmarks, new Set([id]), target.parentId);
      return { ...applyBookmarks(reorderNodeBefore(movedTree, id, beforeId), state.searchQuery, state.tagsByBookmarkId, state.tagFilter), mutating: false };
    });
    await get().addActivity({ type: 'move', messageKey: 'activity.reorderedBookmark' });
    return { success: true, data: undefined };
  },
  undoLastDelete: async () => {
    const snapshot = get().lastDeletedSnapshot;
    if (!snapshot) return { success: true, data: 0 };

    set({ mutating: true, error: null });
    const currentBookmarks = get().bookmarks;
    const restored = await bookmarkService.restoreMany(snapshot.items, currentBookmarks);
    const fallback = restored.success
      ? restoreDeletedBookmarkNodes(currentBookmarks, snapshot.items, restored.data.idMap)
      : currentBookmarks;
    const truth = await readBookmarkTruth(fallback);
    if (!truth.success) {
      set({ error: truth.error, lastDeletedSnapshot: null, mutating: false });
      return truth;
    }
    if (!restored.success) {
      set({
        ...applyBookmarks(truth.data, get().searchQuery, get().tagsByBookmarkId, get().tagFilter),
        error: restored.error,
        lastDeletedSnapshot: null,
        mutating: false
      });
      return restored;
    }

    const nextTags = { ...get().tagsByBookmarkId };
    for (const item of snapshot.items) {
      delete nextTags[item.oldId];
      const nextId = restored.data.idMap[item.oldId];
      if (nextId && item.tags.length > 0) nextTags[nextId] = item.tags;
    }
    const tagsSaved = await saveTags(nextTags);
    if (!tagsSaved.success) {
      set({
        ...applyBookmarks(truth.data, get().searchQuery, nextTags, get().tagFilter),
        tagsByBookmarkId: nextTags,
        error: tagsSaved.error,
        lastDeletedSnapshot: null,
        mutating: false
      });
      return tagsSaved;
    }

    set({
      ...applyBookmarks(truth.data, get().searchQuery, nextTags, get().tagFilter),
      tagsByBookmarkId: nextTags,
      lastDeletedSnapshot: null,
      mutating: false
    });
    await get().addActivity({
      type: 'undo',
      messageKey: 'activity.restoredBookmarks',
      messageValues: {
        count: restored.data.restoredCount,
        suffix: restored.data.restoredCount === 1 ? '' : 's'
      }
    });
    return { success: true, data: restored.data.restoredCount };
  },
  setBookmarkTags: async (id, tags) => {
    const normalizedTags = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 8);
    const tagsByBookmarkId = { ...get().tagsByBookmarkId, [id]: normalizedTags };
    set((state) => ({
      tagsByBookmarkId,
      ...applyBookmarks(state.bookmarks, state.searchQuery, tagsByBookmarkId, state.tagFilter)
    }));
    await saveTags(tagsByBookmarkId);
    await get().addActivity({ type: 'tag', messageKey: 'activity.updatedBookmarkTags' });
  },
  updateBookmarkTags: async (ids, tags, mode) => {
    const normalizedTags = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 8);
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0 || normalizedTags.length === 0) return;

    const removeTags = new Set(normalizedTags);
    const tagsByBookmarkId = { ...get().tagsByBookmarkId };
    for (const id of uniqueIds) {
      const currentTags = tagsByBookmarkId[id] ?? [];
      tagsByBookmarkId[id] =
        mode === 'add'
          ? [...new Set([...currentTags, ...normalizedTags])].slice(0, 8)
          : currentTags.filter((tag) => !removeTags.has(tag));
    }

    set((state) => ({
      tagsByBookmarkId,
      ...applyBookmarks(state.bookmarks, state.searchQuery, tagsByBookmarkId, state.tagFilter)
    }));
    await saveTags(tagsByBookmarkId);
    await get().addActivity({
      type: 'tag',
      messageKey: mode === 'add' ? 'activity.addedBookmarkTags' : 'activity.removedBookmarkTags',
      messageValues: { count: uniqueIds.length }
    });
  },
  setTagFilter: (tag) => {
    set((state) => ({
      tagFilter: tag,
      searchResults: searchBookmarks(state.bookmarks, state.searchQuery).filter((bookmark) => !tag || bookmark.tags?.includes(tag))
    }));
  },
  importBookmarks: async (preview, strategy, targetParentId) => {
    const conflictUrls = new Set(preview.conflicts.map((conflict) => conflict.imported.url));
    const items = strategy === 'skip' ? preview.items.filter((item) => !conflictUrls.has(item.url)) : preview.items;
    if (items.length === 0) return { success: true, data: 0 };

    set({ mutating: true, error: null });
    const currentBookmarks = get().bookmarks;
    const backup = await backupService.create(currentBookmarks, 'import');
    if (!backup.success) {
      set({ error: backup.error, mutating: false });
      return backup;
    }
    set((state) => ({ backups: [backup.data, ...state.backups] }));

    const created = await bookmarkService.createMany(items, targetParentId, currentBookmarks);
    const truth = created.success ? created : await readBookmarkTruth(currentBookmarks);
    if (!truth.success) {
      set({ error: truth.error, mutating: false });
      return truth;
    }
    const refreshedBackups = await getBackupListFallback(get().backups);
    set({
      ...applyBookmarks(truth.data, get().searchQuery, get().tagsByBookmarkId, get().tagFilter),
      backups: refreshedBackups,
      error: created.success ? null : created.error,
      mutating: false
    });
    if (!created.success) return created;

    await get().addActivity({
      type: 'import',
      messageKey: 'activity.importedBookmarks',
      messageValues: { count: items.length, suffix: items.length === 1 ? '' : 's' }
    });
    return { success: true, data: items.length };
  },
  restoreBackup: async (id) => {
    const target = get().backups.find((backup) => backup.id === id);
    if (!target) return { success: true, data: 0 };

    set({ mutating: true, error: null });
    const restored = await backupRestoreService.restoreMissing(get().bookmarks, target.bookmarks);
    if (!restored.success) {
      set({ error: restored.error, mutating: false });
      return restored;
    }
    if (restored.data === 0) {
      set({ mutating: false });
      return { success: true, data: 0 };
    }

    const tree = await bookmarkService.getTree();
    if (!tree.success) {
      set({ error: tree.error, mutating: false });
      return tree;
    }
    const refreshedBackups = await getBackupListFallback(get().backups);

    set((state) => ({
      ...applyBookmarks(tree.data, state.searchQuery, state.tagsByBookmarkId, state.tagFilter),
      backups: refreshedBackups,
      mutating: false
    }));
    await get().addActivity({
      type: 'restore',
      messageKey: 'activity.restoredBookmarks',
      messageValues: {
        count: restored.data,
        suffix: restored.data === 1 ? '' : 's'
      }
    });
    return { success: true, data: restored.data };
  },
  deleteBackup: async (id) => {
    const removed = await backupService.remove(id);
    if (!removed.success) {
      set({ error: removed.error });
      return removed;
    }
    set((state) => ({ backups: state.backups.filter((backup) => backup.id !== id) }));
    return { success: true, data: undefined };
  },
  addActivity: async (activity) => {
    const recentActivities = [createActivity(activity), ...get().recentActivities].slice(0, 10);
    set({ recentActivities });
    await saveActivities(recentActivities);
  }
}));
