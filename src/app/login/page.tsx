'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
import { Sprout, Lock, Mail, User, ShieldCheck, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const configured = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    if (!configured) {
      // Development mock authentication bypass
      setTimeout(() => {
        setIsLoading(false);
        setMessage({
          type: 'success',
          text: `Signed in as ${email || 'operator@greenearth.farm'} (Development Session). Redirecting...`,
        });
        setTimeout(() => {
          router.push('/');
        }, 800);
      }, 500);
      return;
    }

    try {
      const supabase = createClient();
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        setMessage({
          type: 'success',
          text: 'Account created! Please check your email for the confirmation link.',
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setMessage({ type: 'error', text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDevLogin = (devEmail: string) => {
    setEmail(devEmail);
    setPassword('wormwise-secure-demo');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push('/');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#090d0b] text-zinc-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-emerald-500 selection:text-white">
      <div className="max-w-md w-full space-y-6">
        {/* Logo and Heading */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/40 group-hover:scale-105 transition">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">WormWise 🌱</span>
          </Link>
          <h2 className="text-xl font-bold tracking-tight text-white">
            {isSignUp ? 'Create your Farm Operator Account' : 'Sign in to Farm Console'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Secure multi-tenant authentication powered by Supabase Auth & PostgreSQL RLS
          </p>
        </div>

        {/* Configuration Notice Badge */}
        {!configured ? (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/80 text-xs text-amber-200">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Milestone 3: Local Dev Mode</span>
            </div>
            <p className="mt-1 text-[11px] text-amber-200/90 leading-relaxed">
              Supabase credentials not yet detected in <code className="bg-amber-950 px-1 py-0.5 rounded font-mono">.env.local</code>. You can test sign-in with the quick demo profiles below, or connect your real Supabase project URL and anon key.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-xs text-emerald-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Connected to live Supabase Auth instance.</span>
          </div>
        )}

        {/* Auth Form Card */}
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 shadow-xl backdrop-blur-sm">
          {message && (
            <div
              className={`mb-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
                message.type === 'error'
                  ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                  : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              }`}
            >
              {message.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Worm Farm Operator"
                    className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@wormwise.farm"
                  className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-950/50 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : isSignUp ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="mt-4 pt-4 border-t border-zinc-800 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage(null);
              }}
              className="text-xs text-zinc-400 hover:text-emerald-400 transition"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>

        {/* Quick Demo Identities for Cross-Tenant Testing */}
        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 text-xs">
          <p className="text-zinc-400 font-medium mb-2.5">
            Quick Multi-Tenant Profiles (Milestone 3 Seed):
          </p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleQuickDevLogin('operator@greenearth.farm')}
              className="w-full p-2.5 rounded-xl bg-zinc-950/60 hover:bg-zinc-800 border border-zinc-800 text-left transition flex items-center justify-between"
            >
              <div>
                <p className="text-white font-semibold">Tenant 1: GreenEarth Vermiculture</p>
                <p className="text-[11px] text-zinc-400">Role: Operator (Greenhouse Alpha & Beta)</p>
              </div>
              <span className="text-xs text-emerald-400 font-medium">Use Login →</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDevLogin('admin@organicworm.farm')}
              className="w-full p-2.5 rounded-xl bg-zinc-950/60 hover:bg-zinc-800 border border-zinc-800 text-left transition flex items-center justify-between"
            >
              <div>
                <p className="text-white font-semibold">Tenant 2: OrganicWorm Commercial</p>
                <p className="text-[11px] text-zinc-400">Role: Admin (Commercial Facility)</p>
              </div>
              <span className="text-xs text-teal-400 font-medium">Use Login →</span>
            </button>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition">
            ← Return to Live Perception Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
