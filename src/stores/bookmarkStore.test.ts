import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../shared/constants/storage';
import { BackupRecord, BookmarkNode, RecentActivity } from '../shared/types';
import { storageService } from '../services/storageService';
import { bookmarkService } from '../services/bookmarkService';
import { useBookmarkStore } from './bookmarkStore';

describe('bookmarkStore', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    useBookmarkStore.setState({
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
      error: null
    });
    await storageService.set(STORAGE_KEYS.searchHistory, []);
    await storageService.set(STORAGE_KEYS.recentActivities, []);
    await storageService.set(STORAGE_KEYS.bookmarkTags, {});
    await storageService.set(STORAGE_KEYS.backups, []);
  });

  it('persists recent search history', async () => {
    await useBookmarkStore.getState().load();

    await useBookmarkStore.getState().setSearchQuery('react');
    await useBookmarkStore.getState().setSearchQuery('github');
    await useBookmarkStore.getState().setSearchQuery('react');

    expect(useBookmarkStore.getState().recentSearches.slice(0, 2)).toEqual(['react', 'github']);

    const stored = await storageService.get<string[]>(STORAGE_KEYS.searchHistory);
    expect(stored.success).toBe(true);
    if (stored.success) {
      expect(stored.data?.data.slice(0, 2)).toEqual(['react', 'github']);
    }
  });

  it('records recent activity for bookmark actions', async () => {
    await useBookmarkStore.getState().addActivity({
      type: 'delete',
      messageKey: 'activity.deletedBookmarks',
      messageValues: { count: 2, suffix: 's' }
    });

    expect(useBookmarkStore.getState().recentActivities[0]).toMatchObject({
      messageKey: 'activity.deletedBookmarks',
      messageValues: { count: 2, suffix: 's' }
    });

    const stored = await storageService.get<RecentActivity[]>(STORAGE_KEYS.recentActivities);
    expect(stored.success).toBe(true);
    if (stored.success) {
      expect(stored.data?.data[0]).toMatchObject({
        messageKey: 'activity.deletedBookmarks',
        messageValues: { count: 2, suffix: 's' }
      });
    }
  });

  it('renames bookmarks in local state through the service boundary', async () => {
    await useBookmarkStore.getState().load();

    await useBookmarkStore.getState().renameBookmark('101', 'GitHub Home');

    expect(useBookmarkStore.getState().searchResults.find((bookmark) => bookmark.id === '101')?.title).toBe('GitHub Home');
  });

  it('updates bookmark URLs through the service boundary', async () => {
    await useBookmarkStore.getState().load();

    await useBookmarkStore.getState().updateBookmarkUrl('101', 'https://github.com/new');

    expect(useBookmarkStore.getState().searchResults.find((bookmark) => bookmark.id === '101')?.url).toBe('https://github.com/new');
  });

  it('moves selected bookmarks and supports undo after delete', async () => {
    await useBookmarkStore.getState().load();

    await useBookmarkStore.getState().moveBookmarks(['101'], '2');
    expect(useBookmarkStore.getState().bookmarks[1].children?.map((node) => node.id)).toContain('101');

    await useBookmarkStore.getState().deleteBookmarks(['101']);
    expect(useBookmarkStore.getState().searchResults.some((bookmark) => bookmark.id === '101')).toBe(false);

    await useBookmarkStore.getState().undoLastDelete();
    expect(useBookmarkStore.getState().searchResults.some((bookmark) => bookmark.id === '101')).toBe(true);
  });

  it('renames folders, moves folders, and reorders bookmarks', async () => {
    await useBookmarkStore.getState().load();

    await useBookmarkStore.getState().renameFolder('10', 'Renamed Work');
    expect(useBookmarkStore.getState().bookmarks[0].children?.[0].title).toBe('Renamed Work');

    await useBookmarkStore.getState().moveFolders(['10'], '2');
    expect(useBookmarkStore.getState().bookmarks[1].children?.some((node) => node.id === '10')).toBe(true);

    await useBookmarkStore.getState().reorderBookmarkBefore('103', '101');
    const movedFolder = useBookmarkStore.getState().bookmarks[1].children?.find((node) => node.id === '10');
    expect(movedFolder?.children?.slice(0, 2).map((node) => node.id)).toEqual(['103', '101']);
  });

  it('merges duplicate folders after creating a backup', async () => {
    useBookmarkStore.setState({
      bookmarks: [
        {
          id: 'root',
          title: 'Root',
          children: [
            { id: 'target', title: 'Work', parentId: 'root', children: [{ id: 'a', title: 'A', url: 'https://a.test', parentId: 'target' }] },
            { id: 'source', title: 'Work', parentId: 'root', children: [{ id: 'b', title: 'B', url: 'https://b.test', parentId: 'source' }] }
          ]
        }
      ]
    });

    await useBookmarkStore.getState().mergeFolders(['source'], 'target');

    expect(useBookmarkStore.getState().searchResults.map((bookmark) => bookmark.id)).toEqual(['a', 'b']);
    expect(useBookmarkStore.getState().backups[0].reason).toBe('merge');
  });

  it('persists tags and filters bookmarks by tag', async () => {
    await useBookmarkStore.getState().load();

    await useBookmarkStore.getState().setBookmarkTags('101', ['work', 'docs', 'work']);
    useBookmarkStore.getState().setTagFilter('work');

    expect(useBookmarkStore.getState().searchResults.map((bookmark) => bookmark.id)).toEqual(['101']);

    const stored = await storageService.get<Record<string, string[]>>(STORAGE_KEYS.bookmarkTags);
    expect(stored.success).toBe(true);
    if (stored.success) {
      expect(stored.data?.data['101']).toEqual(['work', 'docs']);
    }
  });

  it('adds and removes tags for multiple selected bookmarks', async () => {
    await useBookmarkStore.getState().load();

    await useBookmarkStore.getState().updateBookmarkTags(['101', '102'], ['team', 'docs'], 'add');
    await useBookmarkStore.getState().updateBookmarkTags(['101'], ['docs'], 'remove');

    expect(useBookmarkStore.getState().tagsByBookmarkId['101']).toEqual(['team']);
    expect(useBookmarkStore.getState().tagsByBookmarkId['102']).toEqual(['team', 'docs']);

    const stored = await storageService.get<Record<string, string[]>>(STORAGE_KEYS.bookmarkTags);
    expect(stored.success).toBe(true);
    if (stored.success) {
      expect(stored.data?.data['101']).toEqual(['team']);
      expect(stored.data?.data['102']).toEqual(['team', 'docs']);
    }
  });

  it('imports new bookmarks after creating a backup', async () => {
    await useBookmarkStore.getState().load();

    await useBookmarkStore.getState().importBookmarks(
      {
        items: [
          { title: 'Existing GitHub', url: 'https://github.com', path: [] },
          { title: 'New Import', url: 'https://import.test', path: ['Imported'] }
        ],
        conflicts: [
          {
            imported: { title: 'Existing GitHub', url: 'https://github.com', path: [] },
            existing: useBookmarkStore.getState().searchResults.find((bookmark) => bookmark.url === 'https://github.com')!
          }
        ]
      },
      'skip'
    );

    const imported = useBookmarkStore.getState().searchResults.find((bookmark) => bookmark.url === 'https://import.test');
    expect(imported?.path?.join(' / ')).toContain('Imported / New Import');
    expect(useBookmarkStore.getState().searchResults.filter((bookmark) => bookmark.url === 'https://github.com')).toHaveLength(2);

    const backups = await storageService.get<BackupRecord[]>(STORAGE_KEYS.backups);
    expect(backups.success).toBe(true);
    if (backups.success) {
      expect(backups.data?.data[0].reason).toBe('import');
    }
  });

  it('restores missing bookmarks without deleting the current collection', async () => {
    const backupBookmarks: BookmarkNode[] = [
      {
        id: '1',
        title: 'Bookmarks Bar',
        children: [{
          id: '10',
          title: 'Work',
          parentId: '1',
          children: [
            { id: '101', title: 'GitHub', url: 'https://github.com', parentId: '10' },
            { id: 'backup-bookmark', title: 'Restored', url: 'https://restore.test', parentId: '10' }
          ]
        }]
      }
    ];
    const backup: BackupRecord = {
      id: 'backup-1',
      reason: 'delete',
      createdAt: Date.now(),
      bookmarks: backupBookmarks
    };
    await storageService.set(STORAGE_KEYS.backups, [backup]);

    await useBookmarkStore.getState().load();
    await useBookmarkStore.getState().loadBackups();

    expect(useBookmarkStore.getState().backups).toHaveLength(1);

    const currentBookmarks = useBookmarkStore.getState().bookmarks;
    const workFolder = currentBookmarks[0].children?.[0] as BookmarkNode;
    const freshTree: BookmarkNode[] = currentBookmarks.map((root) => root.id === '1'
      ? {
          ...root,
          children: (root.children as BookmarkNode[]).map((folder) => folder.id === '10'
            ? {
                ...folder,
                children: [...(folder.children as BookmarkNode[]), { id: 'restored', title: 'Restored', url: 'https://restore.test', parentId: workFolder.id }]
              }
            : folder)
        }
      : root);
    const removeManyMock = vi.spyOn(bookmarkService, 'removeMany');
    const getTreeMock = vi.spyOn(bookmarkService, 'getTree').mockResolvedValue({ success: true, data: freshTree });

    await useBookmarkStore.getState().restoreBackup('backup-1');

    expect(removeManyMock).not.toHaveBeenCalled();
    expect(getTreeMock).toHaveBeenCalledOnce();

    const resultUrls = useBookmarkStore.getState().searchResults.map((b) => b.url);
    expect(resultUrls).toContain('https://restore.test');
    expect(resultUrls).toContain('https://github.com');
    expect(resultUrls).toContain('https://developer.mozilla.org');
    expect(resultUrls).toContain('https://react.dev');

    expect(useBookmarkStore.getState().backups[0].reason).toBe('restore');

    await useBookmarkStore.getState().deleteBackup('backup-1');

    expect(useBookmarkStore.getState().backups.some((item) => item.id === 'backup-1')).toBe(false);
  });
});
