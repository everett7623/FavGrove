import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import i18n from '../../shared/i18n';
import type { BookmarkNode, ScanResult } from '../../shared/types';
import { useBookmarkStore } from '../../stores/bookmarkStore';
import { useScanStore } from '../../stores/scanStore';
import LinkIssuesPage from './LinkIssuesPage';

const managedBookmark: BookmarkNode = {
  id: 'managed-link',
  parentId: 'managed-root',
  title: 'Managed link',
  url: 'https://managed.test'
};

const result: ScanResult = {
  duplicateBookmarkGroups: [],
  duplicateFolderGroups: [],
  emptyFolders: [],
  invalidLinks: [{ node: managedBookmark, error: 'HTTP 410', kind: 'broken', reason: 'http-error', status: 410 }]
};

describe('LinkIssuesPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    useBookmarkStore.setState({
      bookmarks: [{
        id: 'managed-root',
        title: 'Managed bookmarks',
        folderType: 'managed',
        unmodifiable: 'managed',
        children: [managedBookmark]
      }],
      mutating: false,
      error: null
    });
    useScanStore.setState({ result });
  });

  afterEach(() => {
    cleanup();
    useScanStore.setState({ result: null });
  });

  it('prevents bookmark mutations for managed link issues', () => {
    render(
      <MemoryRouter>
        <LinkIssuesPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('checkbox', { name: 'Select Managed link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit URL' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Works for me' })).toBeEnabled();
  });
});
