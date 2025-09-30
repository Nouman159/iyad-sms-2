import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useAuthContext } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { GraduationCap, Menu, Home, FileText, Calendar, Book, Box, TrendingUp, University, Rocket, BarChart3, TriangleAlert, DollarSign, Users, Settings, MessageSquare, Heart, Shield, Key, LogOut, Brain, ChevronDown, ChevronRight, ChevronUp, Database } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import iyadLogo from '@assets/IPL Logo WA (1)_1758686081673.png';

const navigation = {
  apps: [
    { 
      name: 'Forms', 
      href: '/apps/forms', 
      icon: FileText, 
      available: true,
      subItems: [
        { name: 'AI Form Builder', href: '/apps/forms/builder', icon: Brain, available: true }
      ]
    },
    { name: 'Events', href: '/apps/events', icon: Calendar, available: true },
    { name: 'SOP', href: '/apps/sop', icon: Book, available: false },
    { name: 'Asset & Inventory', href: '/apps/assets', icon: Box, available: false },
    { name: 'LNA', href: '/apps/lna', icon: TrendingUp, available: false },
    { name: 'IPDM', href: '/apps/ipdm', icon: University, available: false },
    { name: 'Career Development', href: '/apps/career', icon: Rocket, available: false },
    { name: 'Survey Analyser', href: '/apps/survey', icon: BarChart3, available: false },
    { name: 'Incident Reporting', href: '/apps/incidents', icon: TriangleAlert, available: false },
  ],
  dashboards: [
    { name: 'Finance', href: '/dashboards/finance', icon: DollarSign, available: false },
    { name: 'Human Resource', href: '/dashboards/hr', icon: Users, available: false },
    { 
      name: 'Operations', 
      href: '/dashboards/operations', 
      icon: Settings, 
      available: true,
      subItems: [
        { name: 'Student DB', href: '/dashboards/operations/students', icon: Database, available: true }
      ]
    },
    { name: 'Comms & Media', href: '/dashboards/comms', icon: MessageSquare, available: false },
    { name: 'Early Intervention', href: '/dashboards/early-intervention', icon: Heart, available: false },
  ],
  settings: [
    { name: 'Admin Console', href: '/settings/admin', icon: Shield, available: true },
    { name: 'Roles & Permissions', href: '/settings/roles', icon: Key, available: false },
  ],
};

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuthContext();
  const { sidebarCollapsed, setSidebarCollapsed, mobileMenuOpen, setMobileMenuOpen } = useAppContext();
  const isMobile = useIsMobile();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Forms': location.includes('/apps/forms'), // Auto-expand Forms if we're on a Forms page
    'Operations': location.includes('/dashboards/operations') // Auto-expand Operations if we're on an Operations page
  });

  // Auto-expand sections based on current route
  useEffect(() => {
    if (location.includes('/apps/forms')) {
      setExpandedSections(prev => ({ ...prev, 'Forms': true }));
    }
    if (location.includes('/dashboards/operations')) {
      setExpandedSections(prev => ({ ...prev, 'Operations': true }));
    }
  }, [location]);

  // Handle keyboard events for collapsing sections
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        // Collapse all expanded sections when right arrow is pressed
        setExpandedSections(prev => {
          const hasExpanded = Object.values(prev).some(Boolean);
          if (hasExpanded) {
            return Object.keys(prev).reduce((acc, key) => {
              acc[key] = false;
              return acc;
            }, {} as Record<string, boolean>);
          }
          return prev;
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const userInitials = user ? 
    `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 
    user.email?.[0]?.toUpperCase() || 'U' : 'U';

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      <aside 
        className={cn(
          "bg-card border-r border-border flex-shrink-0 flex flex-col transition-all duration-300 relative z-50",
          isMobile ? (
            mobileMenuOpen ? "fixed inset-y-0 left-0 w-80" : "hidden"
          ) : (
            sidebarCollapsed ? "w-20" : "w-80"
          )
        )}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1">
                <img 
                  src={iyadLogo} 
                  alt="IYAD PERDAUS Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="font-bold text-lg text-foreground">iSMS</h1>
                  <p className="text-xs text-muted-foreground">School Management</p>
                </div>
              )}
            </div>
            {!isMobile && (
              <button 
                onClick={toggleSidebar}
                className="p-2 hover:bg-muted rounded-md transition-colors"
                data-testid="sidebar-toggle"
              >
                <Menu className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Home */}
          <div className="px-4 mb-2">
            <Link 
              href="/"
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors",
                location === '/' 
                  ? "bg-accent text-accent-foreground" 
                  : "hover:bg-muted text-foreground"
              )} 
              data-testid="nav-home"
            >
              <Home className="w-5 h-5" />
              {!sidebarCollapsed && <span>Home</span>}
            </Link>
          </div>

          {/* Apps Section */}
          <div className="px-4 mb-4">
            <div className="border-t border-border my-3"></div>
            {!sidebarCollapsed && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Apps</h3>
            )}
            
            <div className="space-y-1">
              {navigation.apps.map((item) => (
                <div key={item.href}>
                  {/* Main navigation item */}
                  <div className="flex items-center">
                    <Link 
                      href={item.available ? item.href : '#'}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors relative flex-1",
                        location === item.href 
                          ? "bg-accent text-accent-foreground" 
                          : "hover:bg-muted text-foreground"
                      )}
                      data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <item.icon className="w-5 h-5" />
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1">{item.name}</span>
                          {!item.available && (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                              Upcoming
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                    
                    {/* Expand/Collapse button for items with sub-items */}
                    {item.subItems && !sidebarCollapsed && (
                      <button
                        onClick={() => toggleSection(item.name)}
                        className="p-1 hover:bg-muted rounded-md transition-colors ml-1"
                        data-testid={`toggle-${item.name.toLowerCase()}`}
                      >
                        {expandedSections[item.name] ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Sub-items */}
                  {item.subItems && expandedSections[item.name] && !sidebarCollapsed && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.available ? subItem.href : '#'}
                          className={cn(
                            "flex items-center space-x-3 px-3 py-1.5 rounded-md transition-colors text-sm",
                            location === subItem.href
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                          data-testid={`nav-${subItem.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <subItem.icon className="w-4 h-4" />
                          <span>{subItem.name}</span>
                          {!subItem.available && (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                              Upcoming
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dashboards Section */}
          <div className="px-4 mb-4">
            <div className="border-t border-border my-3"></div>
            {!sidebarCollapsed && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dashboards</h3>
            )}
            
            <div className="space-y-1">
              {navigation.dashboards.map((item) => (
                <div key={item.href}>
                  {/* Main dashboard item */}
                  <div className="flex items-center">
                    <Link 
                      href={item.available ? item.href : '#'}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors relative flex-1",
                        location === item.href 
                          ? "bg-accent text-accent-foreground" 
                          : "hover:bg-muted text-foreground"
                      )}
                      data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <item.icon className="w-5 h-5" />
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1">{item.name}</span>
                          {!item.available && (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                              Upcoming
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                    
                    {/* Expand/Collapse button for items with sub-items */}
                    {item.subItems && !sidebarCollapsed && (
                      <button
                        onClick={() => toggleSection(item.name)}
                        className="p-1 hover:bg-muted rounded-md transition-colors ml-1"
                        data-testid={`toggle-${item.name.toLowerCase()}`}
                      >
                        {expandedSections[item.name] ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Sub-items */}
                  {item.subItems && expandedSections[item.name] && !sidebarCollapsed && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.available ? subItem.href : '#'}
                          className={cn(
                            "flex items-center space-x-3 px-3 py-1.5 rounded-md transition-colors text-sm",
                            location === subItem.href
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                          data-testid={`nav-${subItem.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <subItem.icon className="w-4 h-4" />
                          <span>{subItem.name}</span>
                          {!subItem.available && (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                              Upcoming
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Settings Section */}
          <div className="px-4">
            <div className="border-t border-border my-3"></div>
            {!sidebarCollapsed && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Settings</h3>
            )}
            
            <div className="space-y-1">
              {navigation.settings.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.available ? item.href : '#'}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors",
                    location === item.href 
                      ? "bg-accent text-accent-foreground" 
                      : "hover:bg-muted text-foreground"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon className="w-5 h-5" />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-border">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors min-h-[44px]"
            data-testid="logout-button"
          >
            <LogOut className="w-4 h-4" />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
              <span className="text-accent-foreground font-semibold text-sm" data-testid="user-initials">
                {userInitials}
              </span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate" data-testid="user-name">
                  {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email}
                </p>
                <p className="text-xs text-muted-foreground truncate" data-testid="user-role">
                  {user?.userType || 'User'}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
