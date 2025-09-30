import { useLocation } from 'wouter';
import { Home, FileText, Shield, Menu } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Forms', href: '/apps/forms', icon: FileText },
  { name: 'Admin', href: '/settings/admin', icon: Shield },
];

export function MobileNav() {
  const [location, setLocation] = useLocation();
  const { setMobileMenuOpen } = useAppContext();

  const handleNavigation = (href: string) => {
    setLocation(href);
  };

  const openMenu = () => {
    setMobileMenuOpen(true);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 h-16">
      <div className="flex items-center justify-around h-full px-4">
        {navigation.map((item) => (
          <button
            key={item.href}
            onClick={() => handleNavigation(item.href)}
            className={cn(
              "flex flex-col items-center justify-center space-y-1 p-2 min-h-[44px] min-w-[44px]",
              location === item.href ? "text-accent" : "text-muted-foreground"
            )}
            data-testid={`mobile-nav-${item.name.toLowerCase()}`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs">{item.name}</span>
          </button>
        ))}
        <button
          onClick={openMenu}
          className="flex flex-col items-center justify-center space-y-1 p-2 text-muted-foreground min-h-[44px] min-w-[44px]"
          data-testid="mobile-menu-toggle"
        >
          <Menu className="w-5 h-5" />
          <span className="text-xs">More</span>
        </button>
      </div>
    </nav>
  );
}
