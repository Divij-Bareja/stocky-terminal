import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registerUser } from '@/services/authService';

function getErrorMessage(err, fallback) {
  if (err.code === 'ERR_NETWORK') {
    return 'Cannot reach server. Start backend on port 8080 and restart frontend.';
  }
  return err.response?.data?.message ?? err.message ?? fallback;
}

export default function RegisterModal({
  open,
  onClose,
  onSuccess,
  onSwitchToLogin,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const authResponse = await registerUser(email.trim(), password);
      onSuccess(authResponse);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to register. Please try again.'));
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
        aria-label="Close register modal"
        disabled={submitting}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card/95 p-6 shadow-2xl shadow-black/40">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Stocky Terminal</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">Create account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Start paper trading with your own portfolio.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground" htmlFor="register-email">
              Email
            </label>
            <Input
              id="register-email"
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
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground" htmlFor="register-password">
              Password
            </label>
            <Input
              id="register-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a password"
              autoComplete="new-password"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground" htmlFor="register-confirm-password">
              Confirm password
            </label>
            <Input
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat password"
              autoComplete="new-password"
              required
              disabled={submitting}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Register'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <button
            type="button"
            className="font-medium text-emerald-400 hover:text-emerald-300"
            onClick={onSwitchToLogin}
            disabled={submitting}
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
