import { BarChart3, Bookmark, BrainCircuit, FolderTree, Import, Menu, ScanSearch, Search, Settings } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';
import { useBookmarkStore } from '../../stores/bookmarkStore';
import { CURRENT_EXTENSION_VERSION } from '../../services/updateService';
import { UpdateBanner } from './UpdateBanner';

const navigation = [
  { to: '/', key: 'dashboard', icon: BarChart3 },
  { to: '/scanner', key: 'scanner', icon: ScanSearch },
  { to: '/manager', key: 'manager', icon: FolderTree },
  { to: '/import-export', key: 'importExport', icon: Import },
  { to: '/ai-analysis', key: 'aiAnalysis', icon: BrainCircuit },
  { to: '/settings', key: 'settings', icon: Settings }
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const searchResults = useBookmarkStore((state) => state.searchResults);
  const setSearchQuery = useBookmarkStore((state) => state.setSearchQuery);

  useEffect(() => {
    void setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('global-bookmark-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r bg-white transition-transform lg:static lg:translate-x-0 dark:bg-slate-950',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <span className="rounded-lg bg-indigo-600 p-2 text-white"><Bookmark size={18} fill="currentColor" /></span>
          <span className="font-semibold">{t('appName')}</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navigation.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900',
                  isActive && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200'
                )
              }
            >
              <Icon size={17} />
              {t(`navigation.${key}`)}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b bg-white px-4 lg:px-6 dark:bg-slate-950">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen((value) => !value)} aria-label={t('actions.menu')}>
            <Menu size={19} />
          </Button>
          <div className="hidden min-w-52 lg:block">
            <div className="text-sm font-semibold">{t('appName')}</div>
            <div className="text-xs text-slate-500">{t('tagline')}</div>
          </div>
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:bg-slate-900">
            <Search size={16} />
            <input
              id="global-bookmark-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('search.placeholder')}
              className="min-w-0 flex-1 bg-transparent text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
            />
            <span className="hidden rounded border px-1.5 py-0.5 text-xs lg:inline">{t('search.shortcut')}</span>
            {searchInput.trim() && <span className="text-xs">{searchResults.length}</span>}
          </label>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200">{t('status.beta')}</span>
        </header>
        <UpdateBanner />
        <main className="min-h-0 flex-1 overflow-auto p-4 lg:p-6">{children}</main>
        <footer className="flex h-10 items-center justify-between border-t bg-white px-4 text-xs text-slate-500 lg:px-6 dark:bg-slate-950">
          <span>{t('footer.localOnly')}</span>
          <span>v{CURRENT_EXTENSION_VERSION}</span>
        </footer>
      </div>
    </div>
  );
}
