// components/AuthButton.tsx
"use client";

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import type { Session } from '@supabase/auth-helpers-nextjs';

export default function AuthButton() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      // Close the modal on successful sign-in
      if (event === 'SIGNED_IN') {
        setIsAuthModalOpen(false);
      }
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

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
          <Button onClick={handleSignOut} variant="outline" className='cursor-pointer' >Sign Out</Button>
        </div>
      ) : (
        <Button onClick={() => setIsAuthModalOpen(true)} className='cursor-pointer'>Sign In</Button>
      )}

      {/* Auth Modal */}
      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign In or Create an Account</DialogTitle>
          </DialogHeader>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            theme="dark"
            providers={['google', 'github']} // Optional: add social providers
            redirectTo={`${appUrl}/auth/callback`}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
