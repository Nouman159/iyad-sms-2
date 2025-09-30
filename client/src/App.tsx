import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuthContext } from "@/context/AuthContext";
import { Layout } from "@/components/layout/Layout";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Forms from "@/pages/Forms";
import FormBuilder from "@/pages/FormBuilder";
import FormResponses from "@/pages/FormResponses";
import PublicForm from "@/pages/PublicForm";
import Events from "@/pages/Events";
import AdminConsole from "@/pages/AdminConsole";
import Operations from "@/pages/Operations";
import StudentDB from "@/pages/StudentDB";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthContext();
  
  if (!isAuthenticated) {
    // Redirect to login for unauthenticated users
    window.location.href = '/api/login';
    return null;
  }
  
  return <>{children}</>;
}

// Reserved slugs that should not be treated as form URLs
const RESERVED_SLUGS = [
  'apps', 'settings', 'dashboards', 'preview', 'api', 'assets', 
  'vite', 'favicon.ico', 'login', 'logout', 'auth'
];

function PublicFormRoute({ params }: { params: { url: string } }) {
  const { url } = params;
  
  // Check if the URL is a reserved slug
  if (RESERVED_SLUGS.includes(url.toLowerCase())) {
    return <NotFound />;
  }
  
  return <PublicForm isPreview={false} />;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="text-foreground font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Preview form route - authenticated and scoped */}
      <Route path="/preview/:url">
        <ProtectedRoute>
          <PublicForm isPreview={true} />
        </ProtectedRoute>
      </Route>
      
      {/* Public form route - direct URL without prefix, outside Layout */}
      <Route path="/:url" component={PublicFormRoute} />
      
      {/* All other routes wrapped in Layout with sidebar */}
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={isAuthenticated ? Home : Landing} />
            <Route path="/apps/forms">
              <ProtectedRoute>
                <Forms />
              </ProtectedRoute>
            </Route>
            <Route path="/apps/forms/builder">
              <ProtectedRoute>
                <FormBuilder />
              </ProtectedRoute>
            </Route>
            <Route path="/apps/forms/edit/:id">
              <ProtectedRoute>
                <FormBuilder />
              </ProtectedRoute>
            </Route>
            <Route path="/apps/forms/responses/:id">
              <ProtectedRoute>
                <FormResponses />
              </ProtectedRoute>
            </Route>
            <Route path="/apps/events">
              <ProtectedRoute>
                <Events />
              </ProtectedRoute>
            </Route>
            <Route path="/settings/admin">
              <ProtectedRoute>
                <AdminConsole />
              </ProtectedRoute>
            </Route>
            <Route path="/dashboards/operations">
              <ProtectedRoute>
                <Operations />
              </ProtectedRoute>
            </Route>
            <Route path="/dashboards/operations/students">
              <ProtectedRoute>
                <StudentDB />
              </ProtectedRoute>
            </Route>
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;