import { useAuthContext } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import { Menu } from 'lucide-react';

export function Header() {
  const { user } = useAuthContext();
  const { setMobileMenuOpen } = useAppContext();

  const userInitials = user ? 
    `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 
    user.email?.[0]?.toUpperCase() || 'U' : 'U';

  return (
    <header className="bg-card border-b border-border px-6 py-4 lg:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            data-testid="mobile-menu-button"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-semibold text-foreground">iSMS</h1>
        </div>
        <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
          <span className="text-accent-foreground font-semibold text-sm" data-testid="header-user-initials">
            {userInitials}
          </span>
        </div>
      </div>
    </header>
  );
}
