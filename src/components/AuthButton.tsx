// components/AuthButton.tsx
"use client";

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import type { Session } from '@supabase/auth-helpers-nextjs';

export default function AuthButton() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const supabase = createClientComponentClient();

  // State to toggle between our custom Sign Up form and the Supabase Sign In UI
  const [authView, setAuthView] = useState<'sign_up' | 'sign_in'>('sign_in');

  // State for our custom form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN') {
        setIsAuthModalOpen(false);
        resetFormState();
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);
  
  const resetFormState = () => {
      setAuthMessage(null);
      setEmail('');
      setPassword('');
      setAuthView('sign_in'); // Default to sign in view when modal is re-opened
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthMessage(null);

    if (password.length < 6) {
        setAuthMessage("Password must be at least 6 characters long.");
        setIsLoading(false);
        return;
    }

    try {
      const checkResponse = await fetch('/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const { exists, message: checkMessage } = await checkResponse.json();

      if (!checkResponse.ok) throw new Error(checkMessage || "Error checking email.");

      if (exists) {
        setAuthMessage("This email is already registered. Please Sign In instead.");
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setAuthMessage(error.message);
      } else {
        setAuthMessage("Success! Please check your email for a confirmation link.");
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setAuthMessage(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <div className="absolute top-4 right-4">
      {session ? (
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">Welcome, {session.user.email}</p>
          <Button onClick={handleSignOut} variant="outline">Sign Out</Button>
        </div>
      ) : (
        <Button onClick={() => setIsAuthModalOpen(true)}>Sign In</Button>
      )}

      {/* Auth Modal with Hybrid Form */}
      <Dialog open={isAuthModalOpen} onOpenChange={(isOpen) => {
          setIsAuthModalOpen(isOpen);
          if (!isOpen) {
              resetFormState();
          }
      }}>
        <DialogContent className="sm:max-w-md bg-[#232323] border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{authView === 'sign_in' ? 'Sign In' : 'Create an Account'}</DialogTitle>
          </DialogHeader>
          
          {authView === 'sign_in' ? (
            // Pre-built Supabase Sign In UI
            <div>
              <Auth
                supabaseClient={supabase}
                appearance={{ theme: ThemeSupa }}
                theme="dark"
                view="sign_in"
                providers={['google', 'github']}
                redirectTo={`${appUrl}/auth/callback`}
                showLinks={false}
              />
               <p className="text-center text-sm text-gray-400 mt-4">
                Don&apos;t have an account?{' '}
                <button type="button" onClick={() => { setAuthView('sign_up'); setAuthMessage(null); }} className="font-semibold text-green-500 hover:underline focus:outline-none">
                  Sign Up
                </button>
              </p>
            </div>
          ) : (
            // Custom Sign Up Form with styles to match ThemeSupa
            <form onSubmit={handleSignUp}>
              <div className="grid gap-4 py-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="email" className="text-gray-400">Email</Label>
                  <Input 
                    type="email" id="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required 
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="password" className="text-gray-400">Password</Label>
                  <Input 
                    type="password" id="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required 
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
              {authMessage && (
                <p className={`text-sm mb-4 text-center ${authMessage.includes("Success") ? 'text-green-500' : 'text-red-500'}`}>
                  {authMessage}
                </p>
              )}
              <Button type="submit" disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold">
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Button>
              <p className="text-center text-sm text-gray-400 mt-4">
                Already have an account?{' '}
                <button type="button" onClick={() => { setAuthView('sign_in'); setAuthMessage(null); }} className="font-semibold text-green-500 hover:underline focus:outline-none">
                  Sign In
                </button>
              </p>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
