import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import '../shared/i18n';
import { useBookmarkStore } from '../stores/bookmarkStore';
import ImportExportPage from './import-export/ImportExportPage';
import ManagerPage from './manager/ManagerPage';
import SettingsPage from './settings/SettingsPage';

beforeAll(() => {
  class ResizeObserverStub implements ResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      void callback;
    }
    observe(target: Element, options?: ResizeObserverOptions) {
      void target;
      void options;
    }
    unobserve(target: Element) {
      void target;
    }
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub;
});

afterEach(() => {
  cleanup();
  useBookmarkStore.setState({ error: null });
});

function setMutationError() {
  useBookmarkStore.setState({ bookmarks: [], error: 'Mutation failed' });
}

describe('bookmark mutation error feedback', () => {
  it('shows errors on the Manager page', () => {
    setMutationError();
    render(<ManagerPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Mutation failed');
  });

  it('shows errors on the Import / Export page', () => {
    setMutationError();
    render(<ImportExportPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Mutation failed');
  });

  it('shows errors on the Settings page', () => {
    setMutationError();
    render(<SettingsPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Mutation failed');
  });
});
