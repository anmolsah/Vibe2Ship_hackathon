import React, { useState } from "react";
import { Mail, Lock, User, RefreshCw, AlertCircle, Calendar } from "lucide-react";
import { googleSignIn, emailSignIn, emailSignUp } from "../lib/firebase";

export default function AuthScreen({
  onAuthSuccess,
  initialIsSignUp = false
}: {
  onAuthSuccess: (user: any, googleToken: string | null) => void;
  initialIsSignUp?: boolean;
}) {
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !name)) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const user = await emailSignUp(email, password, name);
        onAuthSuccess(user, null);
      } else {
        const user = await emailSignIn(email, password);
        onAuthSuccess(user, null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Authentication failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        onAuthSuccess(result.user, result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Google Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] font-sans flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Dynamic Ambient Background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0a0a0a]/80 border border-white/5 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-lg z-10">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg mx-auto">
            <div className="w-6 h-6 border-2 border-white rounded-full border-t-transparent animate-spin-slow"></div>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white font-display">Priora AI</h2>
          <p className="text-xs text-white/40">Secure Autonomous Chief of Staff Console</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-white/40 block mb-1">Your Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="w-full glass-input rounded-xl pl-9 pr-4 py-2 text-xs"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-white/40 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-white/30" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full glass-input rounded-xl pl-9 pr-4 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-white/40 block mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-white/30" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full glass-input rounded-xl pl-9 pr-4 py-2 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : isSignUp ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-white/5"></div>
          <span className="flex-shrink mx-3 text-[10px] uppercase font-bold tracking-wider text-white/30">Or Secure Access Via</span>
          <div className="flex-grow border-t border-white/5"></div>
        </div>

        {/* Official styled Google Sign In Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-black hover:bg-gray-100 font-semibold py-2 px-4 rounded-xl text-xs shadow-md transition duration-150 ease-in-out flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.414 0-6.19-2.776-6.19-6.19 0-3.414 2.776-6.19 6.19-6.19 1.483 0 2.836.521 3.91 1.383l2.908-2.909C18.683 2.71 15.632 1.62 12.24 1.62 6.55 1.62 1.93 6.24 1.93 11.93s4.62 10.31 10.31 10.31c5.96 0 9.93-4.19 9.93-10.1 0-.61-.06-1.18-.17-1.72l-9.76-.145z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>

        <div className="text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-indigo-400 hover:underline cursor-pointer"
          >
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
