"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Building2, Mail, User } from "lucide-react";

export default function LoginPage() {
  const [isFounder, setIsFounder] = useState(true);
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [email, setEmail] = useState("");

  const handleGoogleLogin = () => {
    // Navigate to the respective dashboard after Google auth
    const callbackUrl = isFounder ? "/founder" : "/employee";
    signIn("google", { callbackUrl });
  };

  const handleCredentialsLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const callbackUrl = isFounder ? "/founder" : "/employee";
    signIn("credentials", {
      name,
      email,
      companyId,
      callbackUrl,
    });
  };

  return (
    <main className="min-h-screen bg-[#f7f6f2] dark:bg-[#121316] text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(13,148,136,0.16),transparent_48%),radial-gradient(circle_at_70%_20%,rgba(251,191,36,0.12),transparent_42%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:120px_120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-8">
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-xl shadow-lg">
            TP
          </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-semibold tracking-tight">
          Welcome to TaskPulse
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Sign in to access your dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/90 dark:bg-[#1a1c20]/90 backdrop-blur-md py-8 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] sm:rounded-3xl sm:px-10 border border-slate-200/60 dark:border-slate-700/60">
          
          {/* Toggle Button */}
          <div className="flex p-1 mb-8 bg-slate-100 dark:bg-[#121316] rounded-xl">
            <button
              onClick={() => setIsFounder(true)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                isFounder 
                  ? "bg-white dark:bg-[#1e2025] text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700/50" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              Founder Login
            </button>
            <button
              onClick={() => setIsFounder(false)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                !isFounder 
                  ? "bg-white dark:bg-[#1e2025] text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700/50" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              Employee Login
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleCredentialsLogin}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-200">
                Full Name
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-xl border-0 py-2.5 pl-10 bg-slate-50 dark:bg-[#121316] text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6 transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="companyId" className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-200">
                Company Name / ID
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="companyId"
                  name="companyId"
                  type="text"
                  required
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="block w-full rounded-xl border-0 py-2.5 pl-10 bg-slate-50 dark:bg-[#121316] text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6 transition-all"
                  placeholder="Acme Corp"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-slate-900 dark:text-slate-200">
                Email address
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border-0 py-2.5 pl-10 bg-slate-50 dark:bg-[#121316] text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6 transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-4">
              <button
                type="submit"
                className="flex w-full justify-center items-center gap-2 rounded-xl bg-slate-900 dark:bg-teal-600 px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-slate-800 dark:hover:bg-teal-500 transition-all"
              >
                Login
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-xs font-medium leading-6">
                  <span className="bg-white dark:bg-[#1a1c20] px-6 text-slate-500">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex w-full justify-center items-center gap-3 rounded-xl bg-white dark:bg-[#121316] px-3 py-3 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
              >
                <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
                  <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
                  <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
                  <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
                </svg>
                Google
              </button>
            </div>
          </form>
        </div>
        
        <p className="mt-8 text-center text-xs text-slate-500">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  );
}
