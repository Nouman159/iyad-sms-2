import { ConfidentialClientApplication, type AuthorizationUrlRequest, type AuthorizationCodeRequest } from '@azure/msal-node';
import type { Express, Request, Response } from 'express';
import { storage } from './storage';
import crypto from 'crypto';

// Microsoft OAuth configuration
const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}`,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel: any, message: string, containsPii: boolean) {
        if (!containsPii) {
          console.log(message);
        }
      },
      piiLoggingEnabled: false,
      logLevel: 3, // Info
    },
  },
};

// Initialize MSAL client
let cca: ConfidentialClientApplication | null = null;

function getMsalClient() {
  if (!cca) {
    cca = new ConfidentialClientApplication(msalConfig);
  }
  return cca;
}

// Get redirect URI based on environment
function getRedirectUri() {
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000/auth/microsoft/callback';
  }
  return `https://${domain}/auth/microsoft/callback`;
}

export function setupMicrosoftAuth(app: Express) {
  // Microsoft OAuth login route
  app.get('/auth/microsoft', async (req: Request, res: Response) => {
    try {
      // Check if Microsoft OAuth is configured
      if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
        return res.status(400).json({ 
          message: 'Microsoft OAuth is not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET environment variables.' 
        });
      }

      // Generate cryptographically random state for CSRF protection
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state in session for verification on callback
      (req.session as any).msAuthState = state;

      const authCodeUrlParameters: AuthorizationUrlRequest = {
        scopes: ['user.read', 'openid', 'profile', 'email'],
        redirectUri: getRedirectUri(),
        responseMode: 'form_post',
        state: state, // Include state parameter for CSRF protection
      };

      const authCodeUrl = await getMsalClient().getAuthCodeUrl(authCodeUrlParameters);
      res.redirect(authCodeUrl);
    } catch (error) {
      console.error('Microsoft auth error:', error);
      res.status(500).json({ message: 'Error initiating Microsoft authentication' });
    }
  });

  // Microsoft OAuth callback route
  app.post('/auth/microsoft/callback', async (req: Request, res: Response) => {
    try {
      // Verify state parameter for CSRF protection
      const receivedState = req.body.state;
      const storedState = (req.session as any).msAuthState;
      
      if (!receivedState || !storedState || receivedState !== storedState) {
        console.error('Microsoft auth state mismatch - possible CSRF attack');
        return res.redirect('/?error=microsoft_auth_security_error');
      }
      
      // Clear the state from session after verification
      delete (req.session as any).msAuthState;

      const tokenRequest: AuthorizationCodeRequest = {
        code: req.body.code,
        scopes: ['user.read', 'openid', 'profile', 'email'],
        redirectUri: getRedirectUri(),
      };

      const response = await getMsalClient().acquireTokenByCode(tokenRequest);
      
      if (!response.account) {
        throw new Error('No account information received from Microsoft');
      }

      // Extract user information from Microsoft account
      const account = response.account;
      const email = account.username; // This is the email
      const name = account.name || email.split('@')[0];
      
      // Determine department and userType based on email domain or default values
      let department = 'General';
      let userType = 'User';
      
      // Check if user is in authorized users list
      const AUTHORIZED_USERS = [
        { email: 'cck@iyad.sg', name: 'CCK', dept: 'CCK', userType: 'HOD' },
        { email: 'je@iyad.sg', name: 'JE', dept: 'JE', userType: 'HOD' },
        { email: 'hg@iyad.sg', name: 'HG', dept: 'HG', userType: 'HOD' },
        { email: 'hq@iyad.sg', name: 'HQ', dept: 'HQ', userType: 'HOD' },
        { email: 'admin@iyad.sg', name: 'Admin', dept: 'Admin', userType: 'Master Admin' },
      ];
      
      const authorizedUser = AUTHORIZED_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (authorizedUser) {
        department = authorizedUser.dept;
        userType = authorizedUser.userType;
      }

      // Create or update user in database
      const dbUser = await storage.upsertUser({
        email,
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ') || department,
        profileImageUrl: null,
        department,
        userType,
      });

      // Create session
      (req.session as any).user = {
        claims: {
          sub: dbUser.id,
          email: dbUser.email,
          first_name: dbUser.firstName,
          last_name: dbUser.lastName,
        },
      };

      // Redirect to main app
      res.redirect('/apps/forms');
    } catch (error) {
      console.error('Microsoft callback error:', error);
      res.redirect('/?error=microsoft_auth_failed');
    }
  });
}
