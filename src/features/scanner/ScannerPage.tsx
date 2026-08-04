import { Play, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { scanService } from '../../services/scanService';
import { useBookmarkStore } from '../../stores/bookmarkStore';
import { useScanStore } from '../../stores/scanStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { Button } from '../../shared/components/ui/Button';
import { ConfirmDialog } from '../../shared/components/ui/ConfirmDialog';
import type { BookmarkNode, Result } from '../../shared/types';
import { flattenBookmarks, planDuplicateBookmarkCleanup } from '../../shared/utils/bookmarks';
import { normalizeLinkIssue } from '../../shared/utils/linkCheck';

type ConfirmState = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
};

export default function ScannerPage() {
  const { t } = useTranslation();
  const bookmarks = useBookmarkStore((state) => state.bookmarks);
  const mutating = useBookmarkStore((state) => state.mutating);
  const mergeFolders = useBookmarkStore((state) => state.mergeFolders);
  const deleteBookmarks = useBookmarkStore((state) => state.deleteBookmarks);
  const result = useScanStore((state) => state.result);
  const progress = useScanStore((state) => state.progress);
  const running = useScanStore((state) => state.running);
  const error = useScanStore((state) => state.error);
  const setProgress = useScanStore((state) => state.setProgress);
  const setResult = useScanStore((state) => state.setResult);
  const setRunning = useScanStore((state) => state.setRunning);
  const setError = useScanStore((state) => state.setError);
  const scannerSettings = useSettingsStore((state) => state.settings.scanner);
  const cacheHours = useSettingsStore((state) => state.settings.cacheHours);
  const linkIssues = (result?.invalidLinks ?? []).map(normalizeLinkIssue);
  const brokenLinkCount = linkIssues.filter((issue) => issue.kind === 'broken').length;
  const unreachableLinkCount = linkIssues.length - brokenLinkCount;
  const [linkProgress, setLinkProgress] = useState({ checked: 0, total: 0, uniqueUrls: 0 });
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  useEffect(() => {
    void scanService.getCache(cacheHours).then((cached) => {
      if (cached.success && cached.data) {
        setResult(cached.data.result, cached.data.createdAt);
        setProgress(100);
      }
    });
  }, [cacheHours, setProgress, setResult]);

  const runScan = async () => {
    setRunning(true);
    setError(null);
    setProgress(0);
    setLinkProgress({ checked: 0, total: 0, uniqueUrls: 0 });
    const scan = await scanService.run(bookmarks, scannerSettings, setProgress, (checked, total, uniqueUrls) => {
      setLinkProgress({ checked, total, uniqueUrls });
    });
    setRunning(false);

    if (!scan.success) {
      setError(scan.error);
      return;
    }

    setResult(scan.data);
    setProgress(100);
    await scanService.saveCache(scan.data);
  };

  const refreshStructureResults = async () => {
    const currentBookmarks = useBookmarkStore.getState().bookmarks;
    const structure = await scanService.runStructureScan(currentBookmarks, setProgress);
    if (!structure.success) {
      setError(structure.error);
      return;
    }

    const bookmarkIds = new Set(flattenBookmarks(currentBookmarks).map((bookmark) => bookmark.id));
    const previousInvalidLinks = useScanStore.getState().result?.invalidLinks ?? [];
    const nextResult = {
      ...structure.data,
      invalidLinks: previousInvalidLinks.filter((invalid) => bookmarkIds.has(invalid.node.id))
    };
    setResult(nextResult);
    setProgress(100);
    await scanService.saveCache(nextResult);
  };

  const runRepair = async (repair: () => Promise<Result<number>>) => {
    setRunning(true);
    setError(null);
    const repaired = await repair();
    await refreshStructureResults();
    if (!repaired.success) setError(repaired.error);
    setRunning(false);
  };

  const cleanDuplicateBookmarkGroup = async (group: BookmarkNode[]) => {
    const { duplicateIds } = planDuplicateBookmarkCleanup(group);
    if (duplicateIds.length === 0) return;
    await runRepair(() => deleteBookmarks(duplicateIds));
  };

  const mergeFolderGroup = async (group: BookmarkNode[]) => {
    const [target, ...sources] = group;
    if (!target || sources.length === 0) return;
    await runRepair(() => mergeFolders(sources.map((folder) => folder.id), target.id));
  };

  const confirmAction = async () => {
    const current = confirmState;
    if (!current) return;
    setConfirmState(null);
    await current.onConfirm();
  };

  const deleteAllEmptyFolders = () => {
    const emptyFolders = result?.emptyFolders ?? [];
    if (emptyFolders.length === 0) return;

    setConfirmState({
      title: t('scanner.confirmDeleteEmptyFoldersTitle'),
      description: t('scanner.confirmDeleteEmptyFoldersDescription', { count: emptyFolders.length }),
      confirmLabel: t('scanner.deleteEmptyFolders'),
      onConfirm: () => runRepair(() => deleteBookmarks(emptyFolders.map((folder) => folder.id)))
    });
  };

  const deleteEmptyFolder = (folder: BookmarkNode) => {
    setConfirmState({
      title: t('scanner.confirmDeleteEmptyFolderTitle'),
      description: t('scanner.confirmDeleteEmptyFolderDescription', { title: folder.path?.join(' / ') ?? folder.title }),
      confirmLabel: t('scanner.deleteEmptyFolder'),
      onConfirm: () => runRepair(() => deleteBookmarks([folder.id]))
    });
  };

  const cleanAllDuplicateBookmarks = () => {
    const groups = result?.duplicateBookmarkGroups ?? [];
    const duplicateIds = groups.flatMap((group) => planDuplicateBookmarkCleanup(group).duplicateIds);
    if (duplicateIds.length === 0) return;

    setConfirmState({
      title: t('scanner.confirmCleanAllDuplicatesTitle'),
      description: t('scanner.confirmCleanAllDuplicatesDescription', { count: duplicateIds.length }),
      confirmLabel: t('scanner.cleanAllDuplicates'),
      onConfirm: () => runRepair(() => deleteBookmarks(duplicateIds))
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('pages.scanner.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('pages.scanner.description')}</p>
        </div>
        <Button onClick={() => void runScan()} disabled={running || bookmarks.length === 0}>
          {running ? <RotateCcw className="mr-2 animate-spin" size={16} /> : <Play className="mr-2" size={16} />}
          {t('scanner.run')}
        </Button>
      </div>

      <div className="rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-950">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{t('scanner.progress')}</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
          <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
        {linkProgress.total > 0 ? (
          <div className="mt-2 text-xs text-slate-500">
            {t('scanner.linkProgress', {
              checked: linkProgress.checked,
              total: linkProgress.total,
              unique: linkProgress.uniqueUrls
            })}
          </div>
        ) : null}
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <ResultPanel title={t('scanner.duplicateBookmarks')} value={result?.duplicateBookmarkGroups.length ?? 0}>
          {(result?.duplicateBookmarkGroups.length ?? 0) > 0 ? (
            <Button className="mb-2 h-8 w-full px-3 text-xs" variant="outline" disabled={mutating || running} onClick={cleanAllDuplicateBookmarks}>
              {t('scanner.cleanAllDuplicates')}
            </Button>
          ) : null}
          {(result?.duplicateBookmarkGroups ?? []).slice(0, 8).map((group) => {
            const cleanup = planDuplicateBookmarkCleanup(group);
            return (
              <div key={group.map((item) => item.id).join('-')} className="rounded-md border p-3 text-sm">
                <div className="break-all font-medium">{group[0]?.url}</div>
                <div className="mt-1 text-xs text-slate-500">{t('scanner.itemCount', { count: group.length })}</div>
                <div className="mt-1 truncate text-xs text-slate-500">
                  {t('scanner.keep')}: {cleanup.keeper?.path?.join(' / ') ?? cleanup.keeper?.title}
                </div>
                <Button
                  className="mt-3 h-8 px-3 text-xs"
                  variant="outline"
                  disabled={mutating || running}
                  onClick={() => void cleanDuplicateBookmarkGroup(group)}
                >
                  {t('scanner.keepOldest', { count: cleanup.duplicateIds.length })}
                </Button>
              </div>
            );
          })}
        </ResultPanel>
        <ResultPanel title={t('scanner.duplicateFolders')} value={result?.duplicateFolderGroups.length ?? 0}>
          {(result?.duplicateFolderGroups ?? []).slice(0, 8).map((group) => (
            <div key={group.map((item) => item.id).join('-')} className="rounded-md border p-3 text-sm">
              <div className="font-medium">{group[0]?.title}</div>
              <div className="mt-1 text-xs text-slate-500">{t('scanner.folderCount', { count: group.length })}</div>
              <div className="mt-1 text-xs text-slate-500">{t('scanner.keepLabel')}: {group[0]?.path?.join(' / ') ?? group[0]?.title}</div>
              <Button className="mt-3 h-8 px-3 text-xs" variant="outline" disabled={mutating || running} onClick={() => void mergeFolderGroup(group)}>
                {t('scanner.mergeFolders')}
              </Button>
            </div>
          ))}
        </ResultPanel>
        <ResultPanel title={t('scanner.emptyFolders')} value={result?.emptyFolders.length ?? 0}>
          {(result?.emptyFolders.length ?? 0) > 0 ? (
            <Button className="mb-2 h-8 w-full px-3 text-xs" variant="outline" disabled={mutating || running} onClick={deleteAllEmptyFolders}>
              {t('scanner.deleteEmptyFolders')}
            </Button>
          ) : null}
          {(result?.emptyFolders ?? []).slice(0, 8).map((folder) => (
            <div key={folder.id} className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <span className="min-w-0 truncate">{folder.path?.join(' / ') ?? folder.title}</span>
              <Button
                className="h-8 px-2 text-xs"
                variant="outline"
                disabled={mutating || running}
                onClick={() => deleteEmptyFolder(folder)}
                aria-label={t('scanner.deleteEmptyFolderAria', { title: folder.path?.join(' / ') ?? folder.title })}
              >
                <Trash2 size={14} />
                {t('scanner.deleteEmptyFolder')}
              </Button>
            </div>
          ))}
        </ResultPanel>
        <ResultPanel title={t('scanner.invalidLinks')} value={result?.invalidLinks.length ?? 0}>
          {linkIssues.slice(0, 3).map((invalid) => (
            <div key={invalid.node.id} className="rounded-md border p-3 text-sm">
              <div className="truncate font-medium">{invalid.node.title || invalid.node.url}</div>
              <div className={`mt-1 truncate text-xs ${invalid.kind === 'broken' ? 'text-red-600' : 'text-amber-600'}`}>
                {invalid.kind === 'broken' ? t('linkIssues.broken') : t('linkIssues.unreachable')} · {t(`linkIssues.reasons.${invalid.reason}`)}
              </div>
            </div>
          ))}
          {linkIssues.length > 0 ? (
            <div className="space-y-3 pt-2">
              <div className="text-xs text-slate-500">
                {t('scanner.linkIssueSummary', { broken: brokenLinkCount, unreachable: unreachableLinkCount })}
              </div>
              <Link to="/scanner/links" className="inline-flex h-9 w-full items-center justify-center rounded-md bg-indigo-600 px-3 text-sm font-medium text-white hover:bg-indigo-700">
                {t('scanner.viewAllLinkIssues', { count: linkIssues.length })}
              </Link>
            </div>
          ) : null}
        </ResultPanel>
      </div>

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

function ResultPanel({ title, value, children }: { title: string; value: number; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <section className="min-h-72 rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-950">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold dark:bg-slate-900">{value}</span>
      </div>
      <div className="space-y-2">{value > 0 ? children : <span className="text-sm text-slate-500">{t('scanner.noResults')}</span>}</div>
    </section>
  );
}
