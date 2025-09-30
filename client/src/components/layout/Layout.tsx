import { useAuthContext } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Header } from './Header';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isAuthenticated } = useAuthContext();
  const isMobile = useIsMobile();

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <AppProvider>
      <div className="h-screen overflow-hidden flex bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {isMobile && <Header />}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
        {isMobile && <MobileNav />}
      </div>
    </AppProvider>
  );
}
