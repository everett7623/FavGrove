import { Suspense, lazy, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import i18n from './shared/i18n';
import { AppLayout } from './shared/components/AppLayout';
import { useBookmarkStore } from './stores/bookmarkStore';
import { useSettingsStore } from './stores/settingsStore';

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const ScannerPage = lazy(() => import('./features/scanner/ScannerPage'));
const LinkIssuesPage = lazy(() => import('./features/scanner/LinkIssuesPage'));
const ManagerPage = lazy(() => import('./features/manager/ManagerPage'));
const ImportExportPage = lazy(() => import('./features/import-export/ImportExportPage'));
const AiAnalysisPage = lazy(() => import('./features/ai-analysis/AiAnalysisPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));

export function App() {
  const { t } = useTranslation();
  const loadBookmarks = useBookmarkStore((state) => state.load);
  const settings = useSettingsStore((state) => state.settings);
  const loadSettings = useSettingsStore((state) => state.load);

  useEffect(() => {
    void loadSettings();
    void loadBookmarks();
  }, [loadBookmarks, loadSettings]);

  useEffect(() => {
    void i18n.changeLanguage(settings.language);
  }, [settings.language]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const shouldUseDark = settings.theme === 'dark' || (settings.theme === 'system' && mediaQuery.matches);
      document.documentElement.classList.toggle('dark', shouldUseDark);
    };

    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [settings.theme]);

  return (
    <HashRouter>
      <AppLayout>
        <Suspense fallback={<div className="p-6 text-sm text-slate-500">{t('status.loading')}</div>}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/scanner" element={<ScannerPage />} />
            <Route path="/scanner/links" element={<LinkIssuesPage />} />
            <Route path="/manager" element={<ManagerPage />} />
            <Route path="/import-export" element={<ImportExportPage />} />
            <Route path="/ai-analysis" element={<AiAnalysisPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppLayout>
    </HashRouter>
  );
}
