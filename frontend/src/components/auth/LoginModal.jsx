import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginUser } from '@/services/authService';

function getErrorMessage(err, fallback) {
  if (err.code === 'ERR_NETWORK') {
    return 'Cannot reach server. Start backend on port 8080 and restart frontend.';
  }
  return err.response?.data?.message ?? err.message ?? fallback;
}

export default function LoginModal({
  open,
  onClose,
  onSuccess,
  onSwitchToRegister,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, submitting]);

  useEffect(() => {
    if (!open) return undefined;

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const authResponse = await loginUser(email.trim(), password);
      onSuccess(authResponse);
      setPassword('');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to log in. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={submitting ? undefined : onClose}
        aria-label="Close login modal"
        disabled={submitting}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card/95 p-6 shadow-2xl shadow-black/40">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Stocky Terminal</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">Log in</h2>
          <p className="mt-1 text-sm text-muted-foreground">Access your portfolio and trading terminal.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground" htmlFor="login-email">
              Email
            </label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={submitting}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground" htmlFor="login-password">
              Password
            </label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={submitting}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Log in'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          No account yet?{' '}
          <button
            type="button"
            className="font-medium text-emerald-400 hover:text-emerald-300"
            onClick={onSwitchToRegister}
            disabled={submitting}
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
}
