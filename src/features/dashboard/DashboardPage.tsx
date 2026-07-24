import { Activity, AlertTriangle, Bookmark, Clock, Copy, FileInput, Folder, Play, Search, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { scanService } from '../../services/scanService';
import { Button } from '../../shared/components/ui/Button';
import { Skeleton } from '../../shared/components/ui/Skeleton';
import { useBookmarkStore } from '../../stores/bookmarkStore';
import { useScanStore } from '../../stores/scanStore';

const formatNumber = (value: number) => new Intl.NumberFormat().format(value);

function formatRelativeTime(timestamp: number, t: (key: string, options?: Record<string, number>) => string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return t('dashboard.relative.justNow');
  if (seconds < 3600) return t('dashboard.relative.minutesAgo', { count: Math.floor(seconds / 60) });
  if (seconds < 86400) return t('dashboard.relative.hoursAgo', { count: Math.floor(seconds / 3600) });
  return t('dashboard.relative.daysAgo', { count: Math.floor(seconds / 86400) });
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const stats = useBookmarkStore((state) => state.stats);
  const loading = useBookmarkStore((state) => state.loading);
  const error = useBookmarkStore((state) => state.error);
  const recentSearches = useBookmarkStore((state) => state.recentSearches);
  const recentActivities = useBookmarkStore((state) => state.recentActivities);
  const scanResult = useScanStore((state) => state.result);
  const lastScanAt = useScanStore((state) => state.lastScanAt);
  const setScanResult = useScanStore((state) => state.setResult);

  useEffect(() => {
    if (lastScanAt) return;

    void scanService.getCache().then((cached) => {
      if (cached.success && cached.data) setScanResult(cached.data.result, cached.data.createdAt);
    });
  }, [lastScanAt, setScanResult]);

  const cards = [
    { label: t('dashboard.cards.bookmarks'), value: stats.totalBookmarks, icon: Bookmark, to: '/manager' },
    { label: t('dashboard.cards.folders'), value: stats.totalFolders, icon: Folder, to: '/manager' },
    { label: t('dashboard.cards.duplicates'), value: stats.duplicateBookmarks, icon: Copy, to: '/scanner' },
    { label: t('dashboard.cards.invalid'), value: scanResult?.invalidLinks.length ?? stats.invalidLinks, icon: AlertTriangle, to: '/scanner' }
  ];
  const duplicateCleanupCount = scanResult?.duplicateBookmarkGroups.reduce((total, group) => total + Math.max(0, group.length - 1), 0) ?? 0;
  const emptyFolderCount = scanResult?.emptyFolders.length ?? 0;
  const linkIssueCount = scanResult?.invalidLinks.length ?? 0;
  const recommendations = [
    duplicateCleanupCount > 0
      ? {
          title: t('dashboard.recommendations.duplicatesTitle'),
          description: t('dashboard.recommendations.duplicatesDescription', { count: duplicateCleanupCount }),
          to: '/scanner'
        }
      : null,
    emptyFolderCount > 0
      ? {
          title: t('dashboard.recommendations.emptyFoldersTitle'),
          description: t('dashboard.recommendations.emptyFoldersDescription', { count: emptyFolderCount }),
          to: '/scanner'
        }
      : null,
    linkIssueCount > 0
      ? {
          title: t('dashboard.recommendations.linkIssuesTitle'),
          description: t('dashboard.recommendations.linkIssuesDescription', { count: linkIssueCount }),
          to: '/scanner/links'
        }
      : null
  ].filter((item): item is { title: string; description: string; to: string } => item !== null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('pages.dashboard.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('pages.dashboard.description')}</p>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, to }) => (
          <Link key={label} to={to} className="rounded-lg border bg-white p-5 shadow-sm transition hover:border-indigo-300 dark:bg-slate-950">
            {loading ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
                <Skeleton className="h-9 w-20" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>{label}</span>
                  <Icon size={18} className="text-indigo-600" />
                </div>
                <div className="mt-3 text-3xl font-semibold">{formatNumber(value)}</div>
              </>
            )}
          </Link>
        ))}
      </div>

      <Link
        to="/scanner"
        className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 dark:bg-slate-950 dark:text-slate-300"
      >
        <Clock size={16} className="text-indigo-600" />
        {t('dashboard.lastScanned', { time: lastScanAt ? formatRelativeTime(lastScanAt, t) : t('dashboard.neverScanned') })}
      </Link>

      <section className="rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{t('dashboard.quickActions')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('dashboard.quickActionsDescription')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/scanner">
                <Play size={16} />
                {t('dashboard.actions.scan')}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/import-export">
                <FileInput size={16} />
                {t('dashboard.actions.import')}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/manager">
                <Bookmark size={16} />
                {t('dashboard.actions.manage')}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/ai-analysis">
                <Sparkles size={16} />
                {t('ai.dashboardAction')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-950">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-indigo-600" />
          <h2 className="font-semibold">{t('dashboard.recommendations.title')}</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {recommendations.length > 0 ? (
            recommendations.map((recommendation) => (
              <Link key={recommendation.title} to={recommendation.to} className="rounded-md border p-3 text-sm transition hover:border-indigo-300 dark:border-slate-800">
                <div className="font-medium">{recommendation.title}</div>
                <p className="mt-1 text-slate-500">{recommendation.description}</p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-slate-500 md:col-span-3">{t('dashboard.recommendations.empty')}</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-950">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-indigo-600" />
          <h2 className="font-semibold">{t('dashboard.searchHistory')}</h2>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {recentSearches.length > 0 ? (
            recentSearches.map((query) => (
              <span key={query} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                {query}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-500">{t('dashboard.noSearchHistory')}</span>
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-950">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-indigo-600" />
          <h2 className="font-semibold">{t('dashboard.recentActivity')}</h2>
        </div>
        <div className="mt-4 space-y-3">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                <span>{activity.messageKey ? t(activity.messageKey, activity.messageValues) : activity.message}</span>
                <span className="shrink-0 text-xs text-slate-500">{new Date(activity.createdAt).toLocaleString()}</span>
              </div>
            ))
          ) : (
            <span className="text-sm text-slate-500">{t('dashboard.noRecentActivity')}</span>
          )}
        </div>
      </section>
    </div>
  );
}
