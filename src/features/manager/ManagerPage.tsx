import { Bookmark, ChevronDown, ChevronRight, Edit3, Folder, Keyboard, RotateCcw, Tags, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BookmarkNode } from '../../shared/types';
import { Button } from '../../shared/components/ui/Button';
import { ConfirmDialog } from '../../shared/components/ui/ConfirmDialog';
import { PromptDialog } from '../../shared/components/ui/PromptDialog';
import { Skeleton } from '../../shared/components/ui/Skeleton';
import { useContainerHeight } from '../../shared/hooks/useContainerHeight';
import { useVirtualList } from '../../shared/hooks/useVirtualList';
import { cn } from '../../shared/utils/cn';
import {
  flattenFolders,
  getFolderDescendantBookmarks,
  getFolderIdsWithFolderChildren,
  getVisibleFolders,
  sortBookmarks,
  type SortOption
} from '../../shared/utils/bookmarks';
import { useBookmarkStore } from '../../stores/bookmarkStore';

const rowHeight = 56;

type PromptState =
  | { kind: 'rename-bookmark'; bookmark: BookmarkNode; title: string; defaultValue: string }
  | { kind: 'rename-folder'; folder: BookmarkNode; title: string; defaultValue: string }
  | { kind: 'edit-tags'; bookmark: BookmarkNode; title: string; defaultValue: string }
  | { kind: 'batch-add-tags' | 'batch-remove-tags'; title: string; defaultValue: string };

type ConfirmState = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
};

export default function ManagerPage() {
  const { t } = useTranslation();
  const bookmarks = useBookmarkStore((state) => state.bookmarks);
  const searchQuery = useBookmarkStore((state) => state.searchQuery);
  const searchResults = useBookmarkStore((state) => state.searchResults);
  const loading = useBookmarkStore((state) => state.loading);
  const mutating = useBookmarkStore((state) => state.mutating);
  const deleteBookmarks = useBookmarkStore((state) => state.deleteBookmarks);
  const renameBookmark = useBookmarkStore((state) => state.renameBookmark);
  const renameFolder = useBookmarkStore((state) => state.renameFolder);
  const moveBookmarks = useBookmarkStore((state) => state.moveBookmarks);
  const moveFolders = useBookmarkStore((state) => state.moveFolders);
  const reorderBookmarkBefore = useBookmarkStore((state) => state.reorderBookmarkBefore);
  const undoLastDelete = useBookmarkStore((state) => state.undoLastDelete);
  const setBookmarkTags = useBookmarkStore((state) => state.setBookmarkTags);
  const updateBookmarkTags = useBookmarkStore((state) => state.updateBookmarkTags);
  const tagsByBookmarkId = useBookmarkStore((state) => state.tagsByBookmarkId);
  const tagFilter = useBookmarkStore((state) => state.tagFilter);
  const setTagFilter = useBookmarkStore((state) => state.setTagFilter);
  const canUndoDelete = useBookmarkStore((state) => state.lastDeletedSnapshot !== null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveTargetId, setMoveTargetId] = useState('');
  const [draggedIds, setDraggedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set());
  const [promptState, setPromptState] = useState<PromptState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const { ref: listContainerRef, height: containerHeight } = useContainerHeight(620);

  const folders = useMemo(() => flattenFolders(bookmarks), [bookmarks]);
  const visibleFolders = useMemo(() => getVisibleFolders(bookmarks, collapsedFolderIds), [bookmarks, collapsedFolderIds]);
  const expandableFolderIds = useMemo(() => getFolderIdsWithFolderChildren(bookmarks), [bookmarks]);
  const availableTags = useMemo(() => [...new Set(Object.values(tagsByBookmarkId).flat())].sort((a, b) => a.localeCompare(b)), [tagsByBookmarkId]);
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tags of Object.values(tagsByBookmarkId)) {
      for (const tag of tags) counts[tag] = (counts[tag] ?? 0) + 1;
    }
    return counts;
  }, [tagsByBookmarkId]);
  const baseVisibleBookmarks = useMemo(
    () => (searchQuery.trim() || tagFilter ? searchResults : getFolderDescendantBookmarks(bookmarks, selectedFolderId)),
    [bookmarks, searchQuery, searchResults, selectedFolderId, tagFilter]
  );
  const visibleBookmarks = useMemo(() => sortBookmarks(baseVisibleBookmarks, sortBy), [baseVisibleBookmarks, sortBy]);
  const visibleBookmarkIds = useMemo(() => new Set(visibleBookmarks.map((bookmark) => bookmark.id)), [visibleBookmarks]);
  const viewportHeight = Math.max(rowHeight, containerHeight);
  const { virtualItems, totalHeight, setScrollTop } = useVirtualList(visibleBookmarks, rowHeight, viewportHeight);
  const selectedCount = selectedIds.size;
  const selectedVisibleCount = [...selectedIds].filter((id) => visibleBookmarkIds.has(id)).length;
  const allVisibleSelected = visibleBookmarks.length > 0 && selectedVisibleCount === visibleBookmarks.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        for (const bookmark of visibleBookmarks) next.delete(bookmark.id);
      } else {
        for (const bookmark of visibleBookmarks) next.add(bookmark.id);
      }
      return next;
    });
  };

  const performDelete = useCallback(async (ids: string[]) => {
    await deleteBookmarks(ids);
    setSelectedIds(new Set());
  }, [deleteBookmarks]);

  const deleteSelected = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (ids.length >= 2) {
      setConfirmState({
        title: t('manager.confirmDeleteTitle'),
        description: t('manager.confirmDeleteDescription', { count: ids.length }),
        confirmLabel: t('manager.deleteSelected'),
        onConfirm: () => performDelete(ids)
      });
      return;
    }

    await performDelete(ids);
  }, [performDelete, selectedIds, t]);

  const performMove = async (ids: string[], targetFolderId: string) => {
    await moveBookmarks(ids, targetFolderId);
    setSelectedIds(new Set());
  };

  const moveSelected = async (targetFolderId = moveTargetId) => {
    const ids = [...selectedIds];
    if (!targetFolderId || ids.length === 0) return;
    if (ids.length >= 2) {
      setConfirmState({
        title: t('manager.confirmMoveTitle'),
        description: t('manager.confirmMoveDescription', { count: ids.length }),
        confirmLabel: t('manager.moveSelected'),
        onConfirm: () => performMove(ids, targetFolderId)
      });
      return;
    }

    await performMove(ids, targetFolderId);
  };

  const renameItem = async (bookmark: BookmarkNode) => {
    setPromptState({
      kind: 'rename-bookmark',
      bookmark,
      title: t('manager.renamePrompt'),
      defaultValue: bookmark.title || t('manager.untitled')
    });
  };

  const renameFolderItem = async (folder: BookmarkNode) => {
    setPromptState({
      kind: 'rename-folder',
      folder,
      title: t('manager.renameFolderPrompt'),
      defaultValue: folder.title || t('manager.untitled')
    });
  };

  const editTags = async (bookmark: BookmarkNode) => {
    setPromptState({
      kind: 'edit-tags',
      bookmark,
      title: t('manager.tagsPrompt'),
      defaultValue: bookmark.tags?.join(', ') ?? ''
    });
  };

  const editSelectedTags = (mode: 'add' | 'remove') => {
    if (selectedIds.size === 0) return;
    setPromptState({
      kind: mode === 'add' ? 'batch-add-tags' : 'batch-remove-tags',
      title: mode === 'add' ? t('manager.addTagsPrompt') : t('manager.removeTagsPrompt'),
      defaultValue: ''
    });
  };

  const toggleFolderCollapsed = (folderId: string) => {
    setCollapsedFolderIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const confirmPrompt = async (value: string) => {
    const current = promptState;
    if (!current) return;
    setPromptState(null);

    if (current.kind === 'rename-bookmark') {
      await renameBookmark(current.bookmark.id, value);
      return;
    }
    if (current.kind === 'rename-folder') {
      await renameFolder(current.folder.id, value);
      return;
    }

    if (current.kind === 'edit-tags') {
      await setBookmarkTags(current.bookmark.id, value.split(','));
      return;
    }

    await updateBookmarkTags([...selectedIds], value.split(','), current.kind === 'batch-add-tags' ? 'add' : 'remove');
  };

  const confirmAction = async () => {
    const current = confirmState;
    if (!current) return;
    setConfirmState(null);
    await current.onConfirm();
  };

  const dropOnFolder = async (folderId: string) => {
    if (draggedIds.length === 0) return;
    await moveFolders(draggedIds, folderId);
    setDraggedIds([]);
    setSelectedIds(new Set());
  };

  const dropBeforeBookmark = async (bookmarkId: string) => {
    const [draggedId] = draggedIds;
    if (!draggedId) return;
    await reorderBookmarkBefore(draggedId, bookmarkId);
    setDraggedIds([]);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (promptState || confirmState) return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isEditable =
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        target?.isContentEditable;
      if (isEditable) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setSelectedIds(new Set(visibleBookmarks.map((bookmark) => bookmark.id)));
        return;
      }

      if (event.key === 'Escape') {
        setSelectedIds(new Set());
        return;
      }

      if (event.key === 'Delete' && selectedIds.size > 0) {
        event.preventDefault();
        void deleteSelected();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [confirmState, deleteSelected, promptState, selectedIds, visibleBookmarks]);

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <section className="rounded-lg border bg-white p-4 shadow-sm dark:bg-slate-950">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">{t('pages.manager.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('pages.manager.description')}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedFolderId(null);
            setSelectedIds(new Set());
          }}
          className={cn(
            'mb-2 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm',
            selectedFolderId === null ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200' : 'hover:bg-slate-100 dark:hover:bg-slate-900'
          )}
        >
          <span className="flex items-center gap-2"><Bookmark size={16} />{t('manager.allBookmarks')}</span>
          <span>{getFolderDescendantBookmarks(bookmarks, null).length}</span>
        </button>
        <div className="max-h-[560px] space-y-1 overflow-auto pr-1">
          {visibleFolders.map((folder) => (
            <FolderButton
              key={folder.id}
              folder={folder}
              selected={selectedFolderId === folder.id}
              count={getFolderDescendantBookmarks(bookmarks, folder.id).length}
              collapsed={collapsedFolderIds.has(folder.id)}
              expandable={expandableFolderIds.has(folder.id)}
              onClick={() => {
                setSelectedFolderId(folder.id);
                setSelectedIds(new Set());
              }}
              onToggleCollapse={() => toggleFolderCollapsed(folder.id)}
              onRename={() => void renameFolderItem(folder)}
              onDragStart={() => setDraggedIds([folder.id])}
              onDrop={() => void dropOnFolder(folder.id)}
            />
          ))}
        </div>
      </section>

      <section className="flex min-h-0 min-w-0 flex-col rounded-lg border bg-white shadow-sm dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="font-semibold">{t('manager.bookmarkList')}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {visibleBookmarks.length.toLocaleString()} {t('manager.visibleItems')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={tagFilter ?? ''}
              onChange={(event) => setTagFilter(event.target.value || null)}
              className="h-9 rounded-md border bg-white px-2 text-sm dark:bg-slate-950"
              aria-label={t('manager.filterByTag')}
            >
              <option value="">{t('manager.allTags')}</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>{t('manager.tagWithCount', { tag, count: tagCounts[tag] ?? 0 })}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="h-9 rounded-md border bg-white px-2 text-sm dark:bg-slate-950"
              aria-label={t('manager.sortBy')}
            >
              <option value="default">{t('manager.sortOptions.default')}</option>
              <option value="title-asc">{t('manager.sortOptions.titleAsc')}</option>
              <option value="title-desc">{t('manager.sortOptions.titleDesc')}</option>
              <option value="date-desc">{t('manager.sortOptions.dateDesc')}</option>
              <option value="date-asc">{t('manager.sortOptions.dateAsc')}</option>
              <option value="url-asc">{t('manager.sortOptions.urlAsc')}</option>
            </select>
            <select
              value={moveTargetId}
              onChange={(event) => setMoveTargetId(event.target.value)}
              className="h-9 rounded-md border bg-white px-2 text-sm dark:bg-slate-950"
              aria-label={t('manager.moveTarget')}
            >
              <option value="">{t('manager.moveTo')}</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.path?.join(' / ') || folder.title}</option>
              ))}
            </select>
            <Button variant="outline" onClick={() => void moveSelected()} disabled={selectedCount === 0 || !moveTargetId || mutating}>
              {t('manager.moveSelected')} {selectedCount > 0 ? `(${selectedCount})` : ''}
            </Button>
            <Button variant="outline" onClick={() => editSelectedTags('add')} disabled={selectedCount === 0 || mutating}>
              <Tags size={16} />
              {t('manager.addTags')} {selectedCount > 0 ? `(${selectedCount})` : ''}
            </Button>
            <Button variant="outline" onClick={() => editSelectedTags('remove')} disabled={selectedCount === 0 || mutating}>
              {t('manager.removeTags')}
            </Button>
            <Button variant="outline" onClick={() => void undoLastDelete()} disabled={!canUndoDelete || mutating}>
              <RotateCcw size={16} />
              {t('manager.undo')}
            </Button>
            <Button variant="outline" onClick={() => void deleteSelected()} disabled={selectedCount === 0 || mutating}>
              <Trash2 size={16} />
              {t('manager.deleteSelected')} {selectedCount > 0 ? `(${selectedCount})` : ''}
            </Button>
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-slate-500"
              title={t('manager.shortcutsHint')}
              aria-label={t('manager.shortcutsHint')}
            >
              <Keyboard size={16} />
            </span>
          </div>
        </div>

        <div className="grid h-10 grid-cols-[36px_minmax(120px,1fr)_80px] items-center border-b px-4 text-xs font-semibold uppercase text-slate-500 md:grid-cols-[36px_minmax(120px,1fr)_minmax(150px,1.2fr)_minmax(96px,0.7fr)_80px]">
          <SelectAllCheckbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected}
            disabled={visibleBookmarks.length === 0}
            ariaLabel={t('manager.selectAll')}
            onChange={toggleAllVisible}
          />
          <span>{t('manager.columns.title')}</span>
          <span className="hidden md:block">{t('manager.columns.url')}</span>
          <span className="hidden md:block">{t('manager.columns.folder')}</span>
          <span>{t('manager.columns.actions')}</span>
        </div>

        <div ref={listContainerRef} className="relative min-h-[320px] flex-1 overflow-auto" onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 10 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div style={{ height: totalHeight }}>
              {virtualItems.map(({ item, offsetTop }) => (
                <BookmarkRow
                  key={item.id}
                  bookmark={item}
                  selected={selectedIds.has(item.id)}
                  offsetTop={offsetTop}
                  onSelectedChange={toggleSelected}
                  onRename={renameItem}
                  onEditTags={editTags}
                  onDragStart={(id) => setDraggedIds(selectedIds.has(id) ? [...selectedIds] : [id])}
                  onDropBefore={dropBeforeBookmark}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <PromptDialog
        open={promptState !== null}
        title={promptState?.title ?? ''}
        defaultValue={promptState?.defaultValue ?? ''}
        confirmLabel={promptState?.kind === 'edit-tags' || promptState?.kind?.startsWith('batch-') ? t('manager.saveTags') : t('manager.save')}
        cancelLabel={t('dialog.cancel')}
        onCancel={() => setPromptState(null)}
        onConfirm={(value) => void confirmPrompt(value)}
      />
      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.title ?? ''}
        description={confirmState?.description ?? ''}
        confirmLabel={confirmState?.confirmLabel ?? t('dialog.confirm')}
        cancelLabel={t('dialog.cancel')}
        variant="destructive"
        onCancel={() => setConfirmState(null)}
        onConfirm={() => void confirmAction()}
      />
    </div>
  );
}

function SelectAllCheckbox({
  checked,
  indeterminate,
  disabled,
  ariaLabel,
  onChange
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  ariaLabel: string;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label={ariaLabel}
    />
  );
}

function FolderButton({
  folder,
  selected,
  count,
  collapsed,
  expandable,
  onClick,
  onToggleCollapse,
  onRename,
  onDragStart,
  onDrop
}: {
  folder: BookmarkNode;
  selected: boolean;
  count: number;
  collapsed: boolean;
  expandable: boolean;
  onClick: () => void;
  onToggleCollapse: () => void;
  onRename: () => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const { t } = useTranslation();
  const depth = Math.max(0, (folder.path?.length ?? 1) - 1);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className={cn(
        'flex w-full items-center rounded-md py-1.5 pr-3 text-left text-sm',
        selected ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200' : 'hover:bg-slate-100 dark:hover:bg-slate-900'
      )}
      style={{ paddingLeft: 12 + depth * 14 }}
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        disabled={!expandable}
        className="mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-500 disabled:opacity-30"
        aria-label={collapsed ? t('manager.expandFolder', { title: folder.title || t('manager.untitled') }) : t('manager.collapseFolder', { title: folder.title || t('manager.untitled') })}
      >
        {expandable ? collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} /> : <span className="h-3.5 w-3.5" />}
      </button>
      <button type="button" onClick={onClick} onDoubleClick={onRename} className="flex min-w-0 flex-1 items-center gap-2 py-0.5 text-left">
        <Folder size={16} className="shrink-0" />
        <span className="truncate">{folder.title || t('manager.untitled')}</span>
      </button>
      <span className="ml-2 text-xs text-slate-500">{count}</span>
    </div>
  );
}

function BookmarkRow({
  bookmark,
  selected,
  offsetTop,
  onSelectedChange,
  onRename,
  onEditTags,
  onDragStart,
  onDropBefore
}: {
  bookmark: BookmarkNode;
  selected: boolean;
  offsetTop: number;
  onSelectedChange: (id: string, checked: boolean) => void;
  onRename: (bookmark: BookmarkNode) => void;
  onEditTags: (bookmark: BookmarkNode) => void;
  onDragStart: (id: string) => void;
  onDropBefore: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      draggable
      onDragStart={() => onDragStart(bookmark.id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDropBefore(bookmark.id)}
      className="absolute grid w-full grid-cols-[36px_minmax(120px,1fr)_80px] items-center gap-2 border-b px-4 text-sm md:grid-cols-[36px_minmax(120px,1fr)_minmax(150px,1.2fr)_minmax(96px,0.7fr)_80px] dark:border-slate-800"
      style={{ height: rowHeight, transform: `translateY(${offsetTop}px)` }}
    >
      <input type="checkbox" checked={selected} onChange={(event) => onSelectedChange(bookmark.id, event.target.checked)} aria-label={t('manager.selectAria', { title: bookmark.title || t('manager.untitled') })} />
      <a href={bookmark.url} target="_blank" rel="noreferrer" className="min-w-0 truncate font-medium hover:text-indigo-600">
        {bookmark.title || t('manager.untitled')}
        {bookmark.tags && bookmark.tags.length > 0 ? <span className="ml-2 text-xs font-normal text-indigo-500">#{bookmark.tags.join(' #')}</span> : null}
      </a>
      <a href={bookmark.url} target="_blank" rel="noreferrer" className="hidden min-w-0 truncate text-slate-500 hover:text-indigo-600 md:block">
        {bookmark.url}
      </a>
      <span className="hidden min-w-0 truncate text-xs text-slate-500 md:block">{bookmark.path?.slice(0, -1).join(' / ')}</span>
      <span className="flex items-center gap-1">
        <button type="button" onClick={() => onRename(bookmark)} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-900" aria-label={t('manager.renameAria', { title: bookmark.title || t('manager.untitled') })}>
          <Edit3 size={15} />
        </button>
        <button type="button" onClick={() => onEditTags(bookmark)} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-900" aria-label={t('manager.editTagsAria', { title: bookmark.title || t('manager.untitled') })}>
          <Tags size={15} />
        </button>
      </span>
    </div>
  );
}
