import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import { useUpcomingModal, UpcomingModal } from '@/components/ui/upcoming-modal';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Calendar, Book, Box, TrendingUp, GraduationCap, Rocket, BarChart3, TriangleAlert } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';

const apps = [
  { id: 'forms', name: 'Forms', description: 'Create and manage digital forms for internal and parent use', icon: FileText, available: true, color: 'bg-primary' },
  { id: 'events', name: 'Events', description: 'Manage and track event attendance with check-in/out functionality', icon: Calendar, available: false, color: 'bg-blue-500' },
  { id: 'sop', name: 'SOP', description: 'Document management system with version control and AI assistant', icon: Book, available: false, color: 'bg-green-500' },
  { id: 'assets', name: 'Asset & Inventory', description: 'Track school resources and equipment with maintenance alerts', icon: Box, available: false, color: 'bg-purple-500' },
  { id: 'lna', name: 'LNA', description: 'Learning Needs Analysis for Technical Skills Competencies', icon: TrendingUp, available: false, color: 'bg-red-500' },
  { id: 'ipdm', name: 'IPDM', description: 'Staff training and professional development tracking', icon: GraduationCap, available: false, color: 'bg-indigo-500' },
  { id: 'career', name: 'Career Development', description: 'Create career development plans and succession planning', icon: Rocket, available: false, color: 'bg-pink-500' },
  { id: 'survey', name: 'Survey Analyser', description: 'Complete survey management and analysis system', icon: BarChart3, available: false, color: 'bg-yellow-500' },
  { id: 'incidents', name: 'Incident Reporting', description: 'Structured incident reporting with corrective action tracking', icon: TriangleAlert, available: false, color: 'bg-orange-500' },
];

export default function Home() {
  const { user } = useAuthContext();
  const { addRecentApp } = useAppContext();
  const { isOpen, appName, showModal, hideModal } = useUpcomingModal();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  // Fetch user session
  const { data: session } = useQuery({
    queryKey: ['/api/user/session'],
    retry: false,
  });

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async (recentApps: string[]) => {
      await apiRequest('POST', '/api/user/session', { recentApps });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      console.error('Failed to update session:', error);
    },
  });

  // Get recent apps from session or context  
  const recentApps = (session as any)?.recentApps || [];
  const mostRecentApp = recentApps[0] ? apps.find(app => app.id === recentApps[0]) : apps[0];

  const handleAppClick = (app: typeof apps[0]) => {
    if (!app.available) {
      showModal(app.name);
      return;
    }

    // Add to recent apps
    addRecentApp(app.id);
    
    // Update session on server
    const newRecentApps = [app.id, ...recentApps.filter((id: string) => id !== app.id)].slice(0, 5);
    updateSessionMutation.mutate(newRecentApps);
    
    // Navigate to the app
    setLocation(`/apps/${app.id}`);
  };

  return (
    <div className="p-6" data-testid="home-page">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to iSMS</h1>
          <p className="text-muted-foreground">
            Manage your school operations efficiently with our integrated platform
          </p>
        </div>

        {/* Recently Opened App */}
        {mostRecentApp && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Recently Opened</h2>
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
              onClick={() => handleAppClick(mostRecentApp)}
              data-testid="recent-app-card"
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#F5FEFE]">
                    <mostRecentApp.icon className="w-6 h-6 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{mostRecentApp.name}</h3>
                    <p className="text-muted-foreground text-sm">{mostRecentApp.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {mostRecentApp.available ? 'Click to continue' : 'Coming soon'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Apps Grid */}
        <div className="mb-8">
          <div className="border-t border-border my-6"></div>
          <h2 className="text-xl font-semibold text-foreground mb-6">Apps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app) => (
              <Card 
                key={app.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 relative"
                onClick={() => handleAppClick(app)}
                data-testid={`app-card-${app.id}`}
              >
                <CardContent className="p-6">
                  {!app.available && (
                    <div className="absolute top-3 right-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                        Upcoming
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#F5FEFE]">
                      <app.icon className="w-6 h-6 text-gray-700" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{app.name}</h3>
                  <p className="text-muted-foreground text-sm">{app.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <UpcomingModal isOpen={isOpen} onClose={hideModal} appName={appName} />
    </div>
  );
}
