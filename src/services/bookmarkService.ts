import type { BookmarkNode, BookmarkRestoreResult, DeletedBookmarkNode, ImportBookmarkItem, Result } from '../shared/types';
import i18n from '../shared/i18n';
import {
  getBookmarkNodeCapabilities,
  indexBookmarkNodes,
  insertBookmarkNodes,
  normalizeBookmarkTree,
  planBookmarkDeletion,
  wouldCreateMoveCycle
} from '../shared/utils/bookmarks';

function createImportedMockTree(items: ImportBookmarkItem[], targetParentId: string): BookmarkNode[] {
  const roots = new Map<string, BookmarkNode>();
  const topLevelNodes: BookmarkNode[] = [];
  const batchId = crypto.randomUUID();

  const getFolder = (title: string, parent?: BookmarkNode): BookmarkNode => {
    const path = [...(parent?.path ?? []), title];
    const key = path.join('\u0000');
    const existing = roots.get(key);
    if (existing) return existing;

    const folder: BookmarkNode = {
      id: `imported-folder-${batchId}-${roots.size}`,
      title,
      parentId: parent?.id ?? targetParentId,
      path,
      children: []
    };
    roots.set(key, folder);
    if (parent) parent.children = [...((parent.children as BookmarkNode[] | undefined) ?? []), folder];
    else topLevelNodes.push(folder);
    return folder;
  };

  items.forEach((item, index) => {
    let parent: BookmarkNode | undefined;
    for (const folderTitle of item.path) parent = getFolder(folderTitle, parent);
    const bookmark: BookmarkNode = {
      id: `imported-${batchId}-${index}`,
      title: item.title,
      url: item.url,
      parentId: parent?.id ?? targetParentId,
      dateAdded: item.dateAdded,
      path: [...item.path, item.title]
    };
    if (parent) parent.children = [...((parent.children as BookmarkNode[] | undefined) ?? []), bookmark];
    else topLevelNodes.push(bookmark);
  });

  return topLevelNodes;
}

function createValidationContext(bookmarks: BookmarkNode[]) {
  return {
    nodes: indexBookmarkNodes(bookmarks),
    capabilities: getBookmarkNodeCapabilities(bookmarks)
  };
}

function validateMutableNodes(context: ReturnType<typeof createValidationContext>, ids: string[]): Result<true> {
  for (const id of ids) {
    if (context.capabilities.get(id)?.canMutate !== true) {
      return { success: false, error: i18n.t('serviceErrors.protectedBookmarkNode') };
    }
  }
  return { success: true, data: true };
}

function validateTargetFolder(context: ReturnType<typeof createValidationContext>, id: string): Result<BookmarkNode> {
  const node = context.nodes.get(id);
  const capability = context.capabilities.get(id);
  if (!node || node.url || capability?.canAcceptChildren !== true) {
    return { success: false, error: i18n.t('serviceErrors.invalidBookmarkTarget') };
  }
  return { success: true, data: node };
}

async function rollbackCreated(ids: string[]): Promise<void> {
  for (const id of [...ids].reverse()) {
    try {
      await chrome.bookmarks.remove(id);
    } catch {
      // Continue so parent folders created earlier can still be removed.
    }
  }
}

export const bookmarkService = {
  usesChromeApi(): boolean {
    return Boolean(globalThis.chrome?.bookmarks);
  },

  async getTree(): Promise<Result<BookmarkNode[]>> {
    try {
      if (!globalThis.chrome?.bookmarks) {
        return { success: true, data: mockBookmarks };
      }

      const tree = await chrome.bookmarks.getTree();
      return { success: true, data: normalizeBookmarkTree(tree as BookmarkNode[]) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : i18n.t('serviceErrors.readBookmarks') };
    }
  },

  async removeMany(ids: string[], bookmarks: BookmarkNode[]): Promise<Result<string[]>> {
    const uniqueIds = [...new Set(ids)];
    const planned = planBookmarkDeletion(bookmarks, new Set(uniqueIds));
    if (!planned || planned.length !== uniqueIds.length) {
      return { success: false, error: i18n.t('serviceErrors.unsupportedBookmarkDelete') };
    }

    try {
      if (!globalThis.chrome?.bookmarks) return { success: true, data: uniqueIds };
      const removed: string[] = [];
      for (const id of uniqueIds) {
        await chrome.bookmarks.remove(id);
        removed.push(id);
      }
      return { success: true, data: removed };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : i18n.t('serviceErrors.deleteBookmarks') };
    }
  },

  async updateTitle(id: string, title: string, bookmarks: BookmarkNode[]): Promise<Result<BookmarkNode>> {
    const mutable = validateMutableNodes(createValidationContext(bookmarks), [id]);
    if (!mutable.success) return mutable;

    try {
      if (!globalThis.chrome?.bookmarks) return { success: true, data: { id, title } };
      const updated = await chrome.bookmarks.update(id, { title });
      return { success: true, data: updated as BookmarkNode };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : i18n.t('serviceErrors.renameBookmark') };
    }
  },

  async updateUrl(id: string, url: string, bookmarks: BookmarkNode[]): Promise<Result<BookmarkNode>> {
    const context = createValidationContext(bookmarks);
    const node = context.nodes.get(id);
    const mutable = validateMutableNodes(context, [id]);
    if (!node?.url || !mutable.success) return mutable.success ? { success: false, error: i18n.t('serviceErrors.protectedBookmarkNode') } : mutable;

    try {
      if (!globalThis.chrome?.bookmarks) return { success: true, data: { id, title: node.title, url } };
      const updated = await chrome.bookmarks.update(id, { url });
      return { success: true, data: updated as BookmarkNode };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : i18n.t('serviceErrors.updateBookmarkUrl') };
    }
  },

  async moveMany(ids: string[], parentId: string, bookmarks: BookmarkNode[]): Promise<Result<string[]>> {
    const uniqueIds = [...new Set(ids)];
    const context = createValidationContext(bookmarks);
    const target = validateTargetFolder(context, parentId);
    if (!target.success) return target;
    const mutable = validateMutableNodes(context, uniqueIds);
    if (!mutable.success) return mutable;
    if (wouldCreateMoveCycle(bookmarks, new Set(uniqueIds), parentId)) {
      return { success: false, error: i18n.t('serviceErrors.invalidBookmarkTarget') };
    }

    try {
      if (!globalThis.chrome?.bookmarks) return { success: true, data: uniqueIds };
      const moved: string[] = [];
      for (const id of uniqueIds) {
        await chrome.bookmarks.move(id, { parentId });
        moved.push(id);
      }
      return { success: true, data: moved };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : i18n.t('serviceErrors.moveBookmarks') };
    }
  },

  async moveOne(id: string, parentId: string | undefined, index: number, bookmarks: BookmarkNode[]): Promise<Result<string>> {
    if (!parentId) return { success: false, error: i18n.t('serviceErrors.invalidBookmarkTarget') };
    const context = createValidationContext(bookmarks);
    const target = validateTargetFolder(context, parentId);
    if (!target.success) return target;
    const mutable = validateMutableNodes(context, [id]);
    if (!mutable.success) return mutable;

    try {
      if (!globalThis.chrome?.bookmarks) return { success: true, data: id };
      await chrome.bookmarks.move(id, { parentId, index });
      return { success: true, data: id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : i18n.t('serviceErrors.reorderBookmark') };
    }
  },

  async mergeFolders(sourceIds: string[], targetId: string, bookmarks: BookmarkNode[]): Promise<Result<string[]>> {
    const uniqueSourceIds = [...new Set(sourceIds)].filter((id) => id !== targetId);
    const context = createValidationContext(bookmarks);
    const mutable = validateMutableNodes(context, [...uniqueSourceIds, targetId]);
    if (!mutable.success) return mutable;
    const target = context.nodes.get(targetId);
    if (
      !target?.children ||
      uniqueSourceIds.some((id) => !context.nodes.get(id)?.children) ||
      wouldCreateMoveCycle(bookmarks, new Set(uniqueSourceIds), targetId)
    ) {
      return { success: false, error: i18n.t('serviceErrors.invalidBookmarkTarget') };
    }

    try {
      if (!globalThis.chrome?.bookmarks) return { success: true, data: uniqueSourceIds };
      for (const sourceId of uniqueSourceIds) {
        const children = await chrome.bookmarks.getChildren(sourceId);
        for (const child of children) await chrome.bookmarks.move(child.id, { parentId: targetId });
        await chrome.bookmarks.remove(sourceId);
      }
      return { success: true, data: uniqueSourceIds };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : i18n.t('serviceErrors.mergeFolders') };
    }
  },

  async restoreMany(items: DeletedBookmarkNode[], bookmarks: BookmarkNode[]): Promise<Result<BookmarkRestoreResult>> {
    const context = createValidationContext(bookmarks);
    for (const parentId of new Set(items.map((item) => item.parentId))) {
      const target = validateTargetFolder(context, parentId);
      if (!target.success) return target;
    }

    if (!globalThis.chrome?.bookmarks) {
      return {
        success: true,
        data: {
          restoredCount: items.length,
          idMap: Object.fromEntries(items.map((item) => [item.oldId, item.oldId]))
        }
      };
    }

    const createdIds: string[] = [];
    const idMap: Record<string, string> = {};
    try {
      for (const item of items) {
        const created = await chrome.bookmarks.create({
          parentId: item.parentId,
          title: item.title,
          url: item.url,
          index: item.index
        });
        createdIds.push(created.id);
        idMap[item.oldId] = created.id;
      }
      return { success: true, data: { restoredCount: items.length, idMap } };
    } catch (error) {
      await rollbackCreated(createdIds);
      return { success: false, error: error instanceof Error ? error.message : i18n.t('serviceErrors.restoreBookmarks') };
    }
  },

  async createMany(items: ImportBookmarkItem[], targetParentId: string, bookmarks: BookmarkNode[]): Promise<Result<BookmarkNode[]>> {
    const target = validateTargetFolder(createValidationContext(bookmarks), targetParentId);
    if (!target.success) return target;

    if (!globalThis.chrome?.bookmarks) {
      const imported = createImportedMockTree(items, targetParentId);
      return { success: true, data: insertBookmarkNodes(bookmarks, targetParentId, imported) };
    }

    const folderByPath = new Map<string, chrome.bookmarks.BookmarkTreeNode>();
    const createdIds: string[] = [];
    try {
      for (const item of items) {
        let parentId = targetParentId;
        const path: string[] = [];
        for (const folderTitle of item.path) {
          path.push(folderTitle);
          const key = path.join('\u0000');
          let folder = folderByPath.get(key);
          if (!folder) {
            folder = await chrome.bookmarks.create({ parentId, title: folderTitle });
            folderByPath.set(key, folder);
            createdIds.push(folder.id);
          }
          parentId = folder.id;
        }
        const bookmark = await chrome.bookmarks.create({ parentId, title: item.title, url: item.url });
        createdIds.push(bookmark.id);
      }

      const tree = await this.getTree();
      if (!tree.success) {
        await rollbackCreated(createdIds);
        return tree;
      }
      return { success: true, data: tree.data };
    } catch (error) {
      await rollbackCreated(createdIds);
      return { success: false, error: error instanceof Error ? error.message : i18n.t('serviceErrors.importBookmarks') };
    }
  }
};

const mockBookmarks: BookmarkNode[] = [
  {
    id: '1',
    title: 'Bookmarks Bar',
    folderType: 'bookmarks-bar',
    children: [
      {
        id: '10',
        title: 'Work',
        parentId: '1',
        children: [
          { id: '101', title: 'GitHub', url: 'https://github.com', parentId: '10' },
          { id: '102', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', parentId: '10' },
          { id: '103', title: 'GitHub Duplicate', url: 'https://github.com', parentId: '10' }
        ]
      },
      { id: '11', title: 'Empty Folder', parentId: '1', children: [] }
    ]
  },
  {
    id: '2',
    title: 'Other Bookmarks',
    folderType: 'other',
    children: [{ id: '201', title: 'React', url: 'https://react.dev', parentId: '2' }]
  }
];
