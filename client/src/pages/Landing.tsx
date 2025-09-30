import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import iyadLogo from '@assets/IPL Logo WA (1)_1758686081673.png';

export default function Landing() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('1234');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Important for session cookies
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: data.message || "Invalid credentials. Please try again.",
        });
        return;
      }

      // Success
      toast({
        title: "Login Successful",
        description: `Welcome back, ${data.user.name}!`,
      });

      // Redirect to main app
      window.location.href = '/apps/forms';
      
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Login Error", 
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background: 'linear-gradient(to bottom right, #3d84a7, #46cdcf)'}}>
      <Card className="w-full max-w-md shadow-2xl" data-testid="login-card">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4 bg-white p-2">
              <img 
                src={iyadLogo} 
                alt="IYAD PERDAUS Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Welcome to iSMS</h1>
            <p className="text-muted-foreground mt-2">Iyad School Management System</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                data-testid="input-email"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                data-testid="input-password"
                required
              />
            </div>
            
            <Button 
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px] bg-[#3d84a7] hover:bg-[#2d6d85] active:bg-[#1d5d75] text-white transition-all duration-200 ease-in-out transform hover:scale-[1.02] focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              data-testid="button-login"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
