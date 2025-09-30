import { useCallback } from 'react';
import { useLocation } from 'wouter';

interface NavigationGuardOptions {
  hasUnsavedChanges: boolean;
  onNavigationBlocked: (targetPath: string) => void;
}

export function useGuardedNavigation({ hasUnsavedChanges, onNavigationBlocked }: NavigationGuardOptions) {
  const [, setLocation] = useLocation();

  const guardedNavigate = useCallback((path: string) => {
    if (hasUnsavedChanges) {
      // Block navigation and trigger confirmation dialog
      onNavigationBlocked(window.location.origin + path);
    } else {
      // Allow navigation
      setLocation(path);
    }
  }, [hasUnsavedChanges, onNavigationBlocked, setLocation]);

  return guardedNavigate;
}