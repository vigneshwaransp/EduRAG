import React, { useState } from 'react';
import { X, BookOpen, Lock, Mail, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, exploreAsDemo } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, fullName);
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    try {
      await exploreAsDemo();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Demo initialization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="relative w-full max-w-md bg-black border border-white p-6 shadow-none font-sans text-white text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white transition-none"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 mx-auto border border-white bg-black flex items-center justify-center text-white mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
            EduRAG Portal Access
          </div>
          <h2 className="text-2xl font-sans font-bold text-white">
            {isRegister ? 'Register Scholar Account' : 'Authenticate Scholar Session'}
          </h2>
          <p className="text-xs font-sans italic text-zinc-400 mt-1">
            {isRegister ? 'Direct access to vectorized academic repositories' : 'Enter credentials or initiate direct evaluation mode'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-zinc-950 border border-zinc-700 text-zinc-300 text-xs font-mono text-left">
            [ERROR] {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {isRegister && (
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Marie Curie"
                  className="w-full bg-black border border-zinc-800 pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">Academic Email</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="scholar@institution.edu"
                className="w-full bg-black border border-zinc-800 pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">Passphrase</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black border border-zinc-800 pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs uppercase tracking-wider transition-none disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Confirm Registration' : 'Authenticate Session'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-zinc-800 text-center space-y-3">
          <button
            onClick={handleDemo}
            type="button"
            className="w-full py-2 bg-black hover:bg-zinc-900 text-white border border-zinc-700 text-xs font-mono font-bold uppercase tracking-wider transition-none"
          >
            Direct Access: Pre-Indexed Treatises
          </button>

          <p className="text-xs font-mono text-zinc-500">
            {isRegister ? 'Existing scholar?' : 'New scholar?'}{' '}
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-white hover:underline font-bold ml-1 uppercase"
            >
              {isRegister ? 'Sign In' : 'Register'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
