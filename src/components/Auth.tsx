import { useState, useEffect } from 'react';
import React from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf, LogIn, Mail, Lock, UserPlus, Fingerprint, Smartphone, ShieldCheck, Database, Globe, Zap } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';

export default function Auth() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authMethod === 'phone' && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      });
    }
  }, [authMethod]);

  const provider = new GoogleAuthProvider();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      await initializeUserProfile(result.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        await initializeUserProfile(result.user, displayName);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        // Ensure profile exists for existing users too
        await initializeUserProfile(result.user);
      }
    } catch (err: any) {
      setError(err.message === 'Firebase: Error (auth/operation-not-allowed).' 
        ? 'Phone/Email authentication Node not yet provisioned in Console.' 
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const appVerifier = window.recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(auth, phone, appVerifier);
      setVerificationId(confirmationResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await verificationId.confirm(otp);
      await initializeUserProfile(result.user);
    } catch (err: any) {
      setError(err.message === 'Firebase: Error (auth/operation-not-allowed).' 
        ? 'Phone sync not yet enabled in Firebase Console.' 
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  const initializeUserProfile = async (user: any, nameOverride?: string) => {
    const profileRef = doc(db, 'users', user.uid);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      await setDoc(profileRef, {
        uid: user.uid,
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        displayName: nameOverride || user.displayName || user.email?.split('@')[0] || 'Citizen',
        role: user.email === 'travisjosh3335@gmail.com' ? 'admin' : 'resident',
        createdAt: new Date().toISOString(),
        registrationLocation: 'Central Sync Port'
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f6] flex items-center justify-center p-6 bg-gradient-to-br from-[#2c3e50]/5 to-[#2ecc71]/5">
      <div id="recaptcha-container"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-black/5"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#2ecc71] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#2ecc71]/20">
            <Leaf className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2c3e50] font-serif italic">TECH TRASH</h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em] font-black mt-2">Municipal Sync Portal</p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-[#3498db] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-[#2980b9] transition-all mb-4 shadow-lg"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 brightness-0 invert" alt="" />
          Continue with Google Sync (Recommended)
        </button>

        <div className="relative my-10">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center text-[8px] uppercase font-black tracking-[0.3em] text-gray-300"><span className="bg-white px-4">Other Sync Methods</span></div>
        </div>

        <div className="flex p-1 bg-gray-100 rounded-xl mb-8 opacity-60 hover:opacity-100 transition-opacity">
          <button 
             onClick={() => { setAuthMethod('email'); setVerificationId(null); }}
             className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", authMethod === 'email' ? "bg-white text-dark shadow-sm" : "text-gray-400")}
          >
            Email Access
          </button>
          <button 
             onClick={() => { setAuthMethod('phone'); setError(''); }}
             className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", authMethod === 'phone' ? "bg-white text-dark shadow-sm" : "text-gray-400")}
          >
            Phone Sync
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl border border-red-100 uppercase tracking-tight">
            {error}
          </div>
        )}

        {authMethod === 'email' ? (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <AnimatePresence mode="wait">
              {isRegistering && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <label className="block text-[9px] uppercase font-black tracking-widest text-gray-400 mb-1.5 ml-1">Full Name</label>
                  <div className="relative">
                    <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ecc71]/20 transition-all text-sm font-medium"
                      placeholder="Enter legal name"
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-[9px] uppercase font-black tracking-widest text-gray-400 mb-1.5 ml-1">Email Endpoint</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ecc71]/20 transition-all text-sm font-medium"
                  placeholder="name@municipal.gov"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] uppercase font-black tracking-widest text-gray-400 mb-1.5 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ecc71]/20 transition-all text-sm font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2c3e50] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-[#1a252f] transition-all shadow-lg"
            >
              {loading ? 'Processing...' : (isRegistering ? 'Create Portal' : 'Establish Link')}
            </button>
          </form>
        ) : (
          <form onSubmit={verificationId ? handleVerifyOtp : handlePhoneSignIn} className="space-y-4">
            {!verificationId ? (
              <div>
                <label className="block text-[9px] uppercase font-black tracking-widest text-gray-400 mb-1.5 ml-1">Phone Number</label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ecc71]/20 transition-all text-sm font-medium"
                    placeholder="+256 700 000 000"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[9px] uppercase font-black tracking-widest text-gray-400 mb-1.5 ml-1">One-Time Security Code</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input 
                    type="text" 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ecc71]/20 transition-all text-sm font-medium"
                    placeholder="Enter 6-digit code"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3498db] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-[#2980b9] transition-all shadow-lg"
            >
              {loading ? 'Verifying...' : (verificationId ? 'Complete Sync' : 'Send Sync Code')}
            </button>
          </form>
        )}

        <div className="border-t border-gray-100 pt-6 text-center">
          <p className="text-[9px] text-gray-400 font-bold uppercase mb-4 tracking-tighter mx-4 leading-relaxed">
            Note: If you see 'operation-not-allowed', use Google login as projects may have security restrictions.
          </p>
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-[10px] font-black uppercase text-[#2ecc71] hover:underline tracking-widest"
          >
            {isRegistering ? 'Existing Account? Login' : 'New Resident? Join Network'}
          </button>
        </div>
      </motion.div>

      {/* Quick Stats Landing Info */}
      <div className="max-w-4xl w-full mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <LandingStat icon={<Globe />} label="Nodes Active" value="128+" />
        <LandingStat icon={<Database />} label="Data Syncs" value="2.4M" />
        <LandingStat icon={<Zap />} label="Response Time" value="14ms" />
      </div>
    </div>
  );
}

function LandingStat({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/50 flex items-center gap-4">
      <div className="p-3 bg-white rounded-xl text-primary shadow-sm">
         {icon}
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-[#95a5a6]">{label}</p>
        <p className="text-xl font-bold text-dark">{value}</p>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

