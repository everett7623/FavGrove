import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BookmarkNode } from '../shared/types';
import { bookmarkService } from './bookmarkService';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('bookmarkService', () => {
  it('creates a nested import tree below the selected target in mock mode', async () => {
    const tree = await bookmarkService.getTree();
    expect(tree.success).toBe(true);
    if (!tree.success) return;

    const result = await bookmarkService.createMany([
      { title: 'React', url: 'https://react.dev', path: ['Imported', 'Docs'] },
      { title: 'Example', url: 'https://example.com', path: ['Imported'] }
    ], '1', tree.data);

    expect(result.success).toBe(true);
    if (result.success) {
      const target = result.data.find((folder) => folder.id === '1');
      const imported = target?.children?.find((folder) => folder.title === 'Imported');
      expect(imported?.children?.[0].title).toBe('Docs');
      expect(imported?.children?.[1].title).toBe('Example');
    }
  });

  it('normalizes the synthetic browser root returned by Chrome', async () => {
    vi.stubGlobal('chrome', {
      bookmarks: {
        getTree: vi.fn().mockResolvedValue([{
          id: '0',
          title: '',
          children: [
            { id: '1', title: 'Bookmarks Bar', parentId: '0', folderType: 'bookmarks-bar', children: [] },
            { id: '2', title: 'Other Bookmarks', parentId: '0', folderType: 'other', children: [] }
          ]
        }])
      }
    });

    const result = await bookmarkService.getTree();

    expect(result).toMatchObject({ success: true, data: [{ id: '1' }, { id: '2' }] });
  });

  it('rolls back imported nodes in reverse order when Chrome creation fails', async () => {
    const create = vi.fn()
      .mockResolvedValueOnce({ id: 'folder', title: 'Imported', parentId: '2', children: [] })
      .mockResolvedValueOnce({ id: 'first', title: 'First', parentId: 'folder', url: 'https://first.test' })
      .mockRejectedValueOnce(new Error('Create failed'));
    const remove = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', { bookmarks: { create, remove } });
    const tree: BookmarkNode[] = [{ id: '2', title: 'Other Bookmarks', folderType: 'other', children: [] }];

    const result = await bookmarkService.createMany([
      { title: 'First', url: 'https://first.test', path: ['Imported'] },
      { title: 'Second', url: 'https://second.test', path: ['Imported'] }
    ], '2', tree);

    expect(result).toEqual({ success: false, error: 'Create failed' });
    expect(remove.mock.calls.map(([id]) => id)).toEqual(['first', 'folder']);
  });

  it('rolls back imported nodes when the final Chrome tree read fails', async () => {
    const create = vi.fn()
      .mockResolvedValueOnce({ id: 'folder', title: 'Imported', parentId: '2', children: [] })
      .mockResolvedValueOnce({ id: 'bookmark', title: 'Imported', parentId: 'folder', url: 'https://imported.test' });
    const remove = vi.fn().mockResolvedValue(undefined);
    const getTree = vi.fn().mockRejectedValue(new Error('Read failed'));
    vi.stubGlobal('chrome', { bookmarks: { create, remove, getTree } });
    const tree: BookmarkNode[] = [{ id: '2', title: 'Other Bookmarks', folderType: 'other', children: [] }];

    const result = await bookmarkService.createMany([
      { title: 'Imported', url: 'https://imported.test', path: ['Imported'] }
    ], '2', tree);

    expect(result).toEqual({ success: false, error: 'Read failed' });
    expect(remove.mock.calls.map(([id]) => id)).toEqual(['bookmark', 'folder']);
  });

  it('rejects protected root deletion before calling Chrome', async () => {
    const remove = vi.fn();
    vi.stubGlobal('chrome', { bookmarks: { remove } });
    const tree: BookmarkNode[] = [{ id: '1', title: 'Bookmarks Bar', folderType: 'bookmarks-bar', children: [] }];

    const result = await bookmarkService.removeMany(['1'], tree);

    expect(result.success).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });
});
