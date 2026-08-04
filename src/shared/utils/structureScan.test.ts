import { describe, expect, it } from 'vitest';
import type { BookmarkNode } from '../types';
import { createStructureScanResult } from './structureScan';

describe('structure scan safety', () => {
  it('excludes permanent and managed nodes from repair candidates', () => {
    const tree: BookmarkNode[] = [{
      id: '0',
      title: '',
      children: [
        { id: '1', title: 'Bookmarks Bar', parentId: '0', folderType: 'bookmarks-bar', children: [] },
        {
          id: '2',
          title: 'Other Bookmarks',
          parentId: '0',
          folderType: 'other',
          children: [
            { id: 'empty', title: 'Empty', parentId: '2', children: [] },
            { id: 'a', title: 'A', parentId: '2', url: 'https://duplicate.test' },
            { id: 'b', title: 'B', parentId: '2', url: 'https://duplicate.test' }
          ]
        },
        {
          id: '3',
          title: 'Managed',
          parentId: '0',
          folderType: 'managed',
          unmodifiable: 'managed',
          children: [
            { id: 'managed-empty', title: 'Empty', parentId: '3', children: [] },
            { id: 'managed-a', title: 'A', parentId: '3', url: 'https://managed.test' },
            { id: 'managed-b', title: 'B', parentId: '3', url: 'https://managed.test' }
          ]
        }
      ]
    }];

    const result = createStructureScanResult(tree);

    expect(result.emptyFolders.map((folder) => folder.id)).toEqual(['empty']);
    expect(result.duplicateBookmarkGroups.map((group) => group.map((bookmark) => bookmark.id))).toEqual([['a', 'b']]);
    expect(result.duplicateFolderGroups).toEqual([]);
  });
});
