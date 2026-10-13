import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BookmarkNode } from '../shared/types';
import { exportService } from './exportService';

const bookmarks: BookmarkNode[] = [
  {
    id: 'root',
    title: 'Root',
    children: [
      { id: '1', title: 'Example', url: 'https://example.com', path: ['Root', 'Example'] },
      { id: '2', title: 'Quote "Site"', url: 'https://example.com?q=1&x=2', path: ['Root', 'Quote "Site"'] }
    ] as BookmarkNode[]
  }
];

describe('exportService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('serializes bookmark data as JSON', () => {
    const result = exportService.toJson(bookmarks);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toContain('https://example.com');
  });

  it('exports CSV with escaped cells', () => {
    const result = exportService.toCsv(bookmarks);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toContain('id,title,url,path,dateAdded');
      expect(result.data).toContain('"Quote ""Site"""');
    }
  });

  it('exports TXT, OPML, and Netscape HTML formats', () => {
    const txt = exportService.toTxt(bookmarks);
    const opml = exportService.toOpml(bookmarks);
    const html = exportService.toHtml(bookmarks);

    expect(txt.success && txt.data).toContain('Example');
    expect(opml.success && opml.data).toContain('&amp;');
    expect(opml.success && opml.data).toContain('FavGrove Bookmark Export');
    expect(html.success && html.data).toContain('NETSCAPE-Bookmark-file-1');
  });

  it('creates a downloadable file descriptor for only the requested format', async () => {
    const worker = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      onerror: null as (() => void) | null,
      postMessage: vi.fn(),
      terminate: vi.fn()
    };
    // A plain function is required: vi.fn's arrow implementation is not constructable under Vitest 4.
    const WorkerMock = vi.fn(function mockWorkerConstructor() {
      return worker;
    });
    vi.stubGlobal('Worker', WorkerMock);

    const filePromise = exportService.createFile(bookmarks, 'csv');
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'create-export', bookmarks, format: 'csv' });
    worker.onmessage?.({ data: { type: 'complete', content: 'csv-only' } } as MessageEvent);
    const file = await filePromise;

    expect(file.success).toBe(true);
    if (file.success) {
      expect(file.data.filename).toMatch(/bookmarks-\d{4}-\d{2}-\d{2}\.csv/);
      expect(file.data.mimeType).toContain('text/csv');
      expect(file.data.content).toBe('csv-only');
    }
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
