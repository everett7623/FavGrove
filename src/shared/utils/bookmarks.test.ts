import { describe, expect, it } from 'vitest';
import type { BookmarkNode } from '../types';
import {
  annotateBookmarkPaths,
  calculateBookmarkStats,
  flattenFolders,
  getBookmarkNodeCapabilities,
  getFolderDescendantBookmarks,
  getFolderIdsWithFolderChildren,
  getVisibleFolders,
  mergeFolderNodes,
  moveBookmarkNodes,
  normalizeBookmarkTree,
  planBookmarkDeletion,
  planDuplicateBookmarkCleanup,
  removeBookmarkNodes,
  reorderNodeBefore,
  searchBookmarks,
  sortBookmarks,
  updateBookmarkNodeTitle,
  updateBookmarkNodeUrl
} from './bookmarks';

const tree: BookmarkNode[] = [
  {
    id: '1',
    title: 'Root',
    children: [
      { id: '2', title: 'GitHub', url: 'https://github.com', parentId: '1' },
      { id: '3', title: 'GitHub Duplicate', url: 'https://github.com', parentId: '1' },
      { id: '4', title: 'Docs', parentId: '1', children: [{ id: '5', title: 'React', url: 'https://react.dev', parentId: '4' }] }
    ]
  }
];

describe('bookmark utilities', () => {
  const sortableBookmarks: BookmarkNode[] = [
    { id: 'b', title: 'Beta', url: 'https://beta.test', dateAdded: 200 },
    { id: 'a', title: 'Alpha', url: 'https://alpha.test', dateAdded: 300 },
    { id: 'c', title: '', url: 'https://charlie.test' }
  ];

  it('keeps the oldest bookmark when planning duplicate cleanup', () => {
    const cleanup = planDuplicateBookmarkCleanup([
      { id: 'newest', title: 'Newest', url: 'https://example.com', dateAdded: 300 },
      { id: 'oldest', title: 'Oldest', url: 'https://example.com', dateAdded: 100 },
      { id: 'middle', title: 'Middle', url: 'https://example.com', dateAdded: 200 }
    ]);

    expect(cleanup.keeper?.id).toBe('oldest');
    expect(cleanup.duplicateIds).toEqual(['middle', 'newest']);
  });

  it('sorts bookmarks by supported fields without mutating the original array', () => {
    expect(sortBookmarks(sortableBookmarks, 'default')).toBe(sortableBookmarks);
    expect(sortBookmarks(sortableBookmarks, 'title-asc').map((bookmark) => bookmark.id)).toEqual(['c', 'a', 'b']);
    expect(sortBookmarks(sortableBookmarks, 'title-desc').map((bookmark) => bookmark.id)).toEqual(['b', 'a', 'c']);
    expect(sortBookmarks(sortableBookmarks, 'date-asc').map((bookmark) => bookmark.id)).toEqual(['c', 'b', 'a']);
    expect(sortBookmarks(sortableBookmarks, 'date-desc').map((bookmark) => bookmark.id)).toEqual(['a', 'b', 'c']);
    expect(sortBookmarks(sortableBookmarks, 'url-asc').map((bookmark) => bookmark.id)).toEqual(['a', 'b', 'c']);
    expect(sortableBookmarks.map((bookmark) => bookmark.id)).toEqual(['b', 'a', 'c']);
  });

  it('updates a bookmark URL without changing its title', () => {
    const updated = updateBookmarkNodeUrl(tree, '2', 'https://github.com/new');
    const bookmark = searchBookmarks(updated, 'GitHub')[0];

    expect(bookmark.title).toBe('GitHub');
    expect(bookmark.url).toBe('https://github.com/new');
  });

  it('normalizes browser roots and protects permanent and managed nodes', () => {
    const chromeTree: BookmarkNode[] = [{
      id: '0',
      title: '',
      children: [
        {
          id: '1',
          title: 'Bookmarks Bar',
          parentId: '0',
          folderType: 'bookmarks-bar',
          children: [{ id: '10', title: 'Writable', parentId: '1', children: [] }]
        },
        {
          id: '3',
          title: 'Managed',
          parentId: '0',
          folderType: 'managed',
          unmodifiable: 'managed',
          children: [{ id: '30', title: 'Managed link', parentId: '3', url: 'https://managed.test' }]
        }
      ]
    }];

    const normalized = normalizeBookmarkTree(chromeTree);
    const annotated = annotateBookmarkPaths(chromeTree);
    const capabilities = getBookmarkNodeCapabilities(chromeTree);

    expect(normalized.map((node) => node.id)).toEqual(['1', '3']);
    expect(annotated[0].path).toEqual(['Bookmarks Bar']);
    expect(capabilities.get('1')).toMatchObject({ permanentRoot: true, canMutate: false, canAcceptChildren: true });
    expect(capabilities.get('10')).toMatchObject({ permanentRoot: false, canMutate: true, canAcceptChildren: true });
    expect(capabilities.get('30')).toMatchObject({ managed: true, canMutate: false, canAcceptChildren: false });
    expect(planBookmarkDeletion(chromeTree, new Set(['1']))).toBeNull();
    expect(planBookmarkDeletion(chromeTree, new Set(['10']))).toHaveLength(1);
  });

  it('rejects non-empty folder deletion but plans empty folders and bookmarks', () => {
    expect(planBookmarkDeletion(tree, new Set(['4']))).toBeNull();
    expect(planBookmarkDeletion(tree, new Set(['2']))).toMatchObject([{ oldId: '2', url: 'https://github.com' }]);
    const withEmpty = [{ ...tree[0], children: [...(tree[0].children as BookmarkNode[]), { id: 'empty', title: 'Empty', parentId: '1', children: [] }] }];
    expect(planBookmarkDeletion(withEmpty, new Set(['empty']))).toMatchObject([{ oldId: 'empty', url: undefined }]);
  });

  it('calculates bookmark stats from a tree', () => {
    expect(calculateBookmarkStats(tree)).toEqual({
      totalBookmarks: 3,
      totalFolders: 2,
      duplicateBookmarks: 2,
      invalidLinks: 0
    });
  });

  it('searches title and url fields', () => {
    expect(searchBookmarks(tree, 'react')).toHaveLength(1);
    expect(searchBookmarks(tree, 'github')).toHaveLength(2);
  });

  it('searches Chinese bookmark titles by full pinyin and initials', () => {
    const chineseTree: BookmarkNode[] = [
      {
        id: 'root',
        title: 'Root',
        children: [{ id: 'cn', title: '书签整理', url: 'https://favgrove.test', parentId: 'root' }]
      }
    ];

    expect(searchBookmarks(chineseTree, 'shu qian')).toHaveLength(1);
    expect(searchBookmarks(chineseTree, 'shuqianzhengli')).toHaveLength(1);
    expect(searchBookmarks(chineseTree, 'sqzl')).toHaveLength(1);
  });

  it('removes bookmark nodes recursively', () => {
    const nextTree = removeBookmarkNodes(tree, new Set(['3', '5']));
    expect(searchBookmarks(nextTree, '')).toHaveLength(1);
    expect(searchBookmarks(nextTree, 'github')).toHaveLength(1);
  });

  it('returns bookmarks below a selected folder', () => {
    expect(getFolderDescendantBookmarks(tree, '4').map((bookmark) => bookmark.title)).toEqual(['React']);
    expect(getFolderDescendantBookmarks(tree, null)).toHaveLength(3);
  });

  it('returns visible folders based on collapsed folder ids', () => {
    expect(getFolderIdsWithFolderChildren(tree).has('1')).toBe(true);
    expect(getVisibleFolders(tree, new Set(['1'])).map((folder) => folder.id)).toEqual(['1']);
    expect(getVisibleFolders(tree, new Set()).map((folder) => folder.id)).toEqual(['1', '4']);
  });

  it('updates a bookmark or folder title recursively', () => {
    const nextTree = updateBookmarkNodeTitle(tree, '5', 'React Docs');
    expect(searchBookmarks(nextTree, 'React Docs')).toHaveLength(1);
  });

  it('moves bookmarks to a target folder', () => {
    const nextTree = moveBookmarkNodes(tree, new Set(['2']), '4');
    expect(getFolderDescendantBookmarks(nextTree, '4').map((bookmark) => bookmark.id)).toEqual(['5', '2']);
  });

  it('moves folders without allowing a folder to move into its descendant', () => {
    const nextTree = moveBookmarkNodes(tree, new Set(['4']), '1');
    expect(flattenFolders(nextTree).find((folder) => folder.id === '4')?.parentId).toBe('1');

    const invalidTree = moveBookmarkNodes(tree, new Set(['4']), '5');
    expect(flattenFolders(invalidTree).find((folder) => folder.id === '4')?.parentId).toBe('1');
  });

  it('reorders sibling nodes before a target node', () => {
    const nextTree = reorderNodeBefore(tree, '3', '2');
    expect(nextTree[0].children?.slice(0, 2).map((node) => node.id)).toEqual(['3', '2']);
  });

  it('merges source folder children into a target folder', () => {
    const mergeTree: BookmarkNode[] = [
      {
        id: 'root',
        title: 'Root',
        children: [
          { id: 'target', title: 'Work', parentId: 'root', children: [{ id: 'a', title: 'A', url: 'https://a.test', parentId: 'target' }] },
          { id: 'source', title: 'Work', parentId: 'root', children: [{ id: 'b', title: 'B', url: 'https://b.test', parentId: 'source' }] }
        ]
      }
    ];

    const nextTree = mergeFolderNodes(mergeTree, new Set(['source']), 'target');
    expect(flattenFolders(nextTree).some((folder) => folder.id === 'source')).toBe(false);
    expect(getFolderDescendantBookmarks(nextTree, 'target').map((bookmark) => bookmark.id)).toEqual(['a', 'b']);
  });
});
