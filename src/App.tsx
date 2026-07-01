/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f4f7f6]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-dark font-medium uppercase tracking-widest text-xs">Syncing Tech Trash...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f6] text-[#333] relative">
      <div className="frosted-bg">
        <div className="blob-emerald opacity-20"></div>
        <div className="blob-blue opacity-10"></div>
        <div className="blob-indigo opacity-5"></div>
      </div>
      <div className="relative z-10 font-sans">
        {user ? <Dashboard user={user} /> : <Auth />}
      </div>
    </div>
  );
}
