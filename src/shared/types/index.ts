export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'zh_CN' | 'en';
export type ExportFormat = 'json' | 'csv' | 'txt' | 'opml' | 'html';
export type ImportFormat = ExportFormat;
export type ImportConflictStrategy = 'skip' | 'import-all';

export type BookmarkFolderType = 'bookmarks-bar' | 'other' | 'mobile' | 'managed';

export interface BookmarkNode extends chrome.bookmarks.BookmarkTreeNode {
  children?: BookmarkNode[];
  path?: string[];
  tags?: string[];
  status?: 'valid' | 'invalid' | 'timeout' | 'unknown';
  folderType?: BookmarkFolderType;
  syncing?: boolean;
}

export interface DeletedBookmarkNode {
  oldId: string;
  parentId: string;
  index?: number;
  title: string;
  url?: string;
  tags: string[];
}

export interface BookmarkRestoreResult {
  restoredCount: number;
  idMap: Record<string, string>;
}

export interface ScannerConfig {
  timeoutMs: number;
  concurrency: number;
  retryCount: number;
}

export interface AppSettings {
  theme: Theme;
  language: Language;
  scanner: ScannerConfig;
  cacheHours: number;
  backupRetention: number;
  autoScan: boolean;
}

export interface BookmarkStats {
  totalBookmarks: number;
  totalFolders: number;
  duplicateBookmarks: number;
  invalidLinks: number;
}

export type ActivityType = 'load' | 'search' | 'delete' | 'rename' | 'move' | 'merge' | 'tag' | 'undo' | 'import' | 'restore' | 'scan' | 'export' | 'settings';

export type ActivityMessageKey =
  | 'activity.loadedBookmarks'
  | 'activity.searched'
  | 'activity.deletedBookmarks'
  | 'activity.renamedBookmark'
  | 'activity.updatedBookmarkUrl'
  | 'activity.movedItems'
  | 'activity.reorderedBookmark'
  | 'activity.restoredBookmarks'
  | 'activity.updatedBookmarkTags'
  | 'activity.addedBookmarkTags'
  | 'activity.removedBookmarkTags'
  | 'activity.importedBookmarks'
  | 'activity.mergedFolders';

export interface RecentActivity {
  id: string;
  type: ActivityType;
  message?: string;
  messageKey?: ActivityMessageKey;
  messageValues?: Record<string, string | number>;
  createdAt: number;
}

export interface ImportBookmarkItem {
  title: string;
  url: string;
  path: string[];
  dateAdded?: number;
}

export interface ImportConflict {
  imported: ImportBookmarkItem;
  existing: BookmarkNode;
}

export interface ImportPreview {
  items: ImportBookmarkItem[];
  conflicts: ImportConflict[];
}

export interface InvalidLink {
  node: BookmarkNode;
  status?: number;
  error: string;
  kind: 'broken' | 'unreachable';
  reason: 'not-found' | 'http-error' | 'server-error' | 'timeout' | 'network' | 'insecure' | 'protected';
}

export interface StoredValue<T> {
  schemaVersion: number;
  data: T;
  updatedAt: number;
}

export interface ExtensionUpdateInfo {
  version: string;
  detectedAt: number;
}

export interface BookmarkRestoreItem {
  title: string;
  url: string;
  path: string[];
  parentId?: string;
}

export interface BackupRecord {
  id: string;
  reason: 'delete' | 'import' | 'merge' | 'restore';
  createdAt: number;
  bookmarks: BookmarkNode[];
}

export interface ScanResult {
  duplicateBookmarkGroups: BookmarkNode[][];
  duplicateFolderGroups: BookmarkNode[][];
  emptyFolders: BookmarkNode[];
  invalidLinks: InvalidLink[];
}

export interface ScanCache {
  result: ScanResult;
  createdAt: number;
}

export interface ScanWorkerRequest {
  type: 'scan';
  bookmarks: BookmarkNode[];
}

export interface ScanWorkerResponse {
  type: 'progress' | 'complete' | 'error';
  progress: number;
  result?: ScanResult;
  error?: string;
}

export interface LinkFetchRequest {
  type: 'check-link';
  url: string;
  settings: ScannerConfig;
}

export interface LinkFetchResponse {
  status?: number;
  statusText?: string;
  cloudflare?: boolean;
  error?: string;
  failure?: 'timeout' | 'network' | 'protected';
}

export type LinkCheckWorkerRequest =
  | {
      type: 'check-links';
      bookmarks: BookmarkNode[];
      settings: ScannerConfig;
    }
  | {
      type: 'link-result';
      requestId: number;
      result: Result<LinkFetchResponse>;
    };

export interface LinkCheckWorkerResponse {
  type: 'progress' | 'complete' | 'error' | 'request-link';
  progress: number;
  requestId?: number;
  request?: LinkFetchRequest;
  checkedBookmarks?: number;
  totalBookmarks?: number;
  uniqueUrls?: number;
  invalidLinks?: InvalidLink[];
  error?: string;
}

export interface ImportHtmlWorkerRequest {
  type: 'parse-import';
  format: ImportFormat;
  content: string;
}

export interface ImportHtmlWorkerResponse {
  type: 'complete' | 'error';
  items?: ImportBookmarkItem[];
  error?: string;
}

export interface ExportWorkerRequest {
  type: 'create-export';
  format: ExportFormat;
  bookmarks: BookmarkNode[];
}

export interface ExportWorkerResponse {
  type: 'complete' | 'error';
  content?: string;
  error?: string;
}

export * from './ai';
