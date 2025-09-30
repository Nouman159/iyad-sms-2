import { createContext, useContext, useState, ReactNode } from 'react';

interface AppContextType {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  recentApps: string[];
  setRecentApps: (apps: string[]) => void;
  addRecentApp: (app: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recentApps, setRecentApps] = useState<string[]>([]);

  const addRecentApp = (app: string) => {
    setRecentApps(prev => {
      const filtered = prev.filter(a => a !== app);
      return [app, ...filtered].slice(0, 5); // Keep only 5 recent apps
    });
  };

  return (
    <AppContext.Provider
      value={{
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileMenuOpen,
        setMobileMenuOpen,
        recentApps,
        setRecentApps,
        addRecentApp,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
