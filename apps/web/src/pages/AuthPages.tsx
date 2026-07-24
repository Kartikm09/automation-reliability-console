import {
  Activity,
  ArrowRight,
  KeyRound,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../lib/errors";
import { supabase } from "../lib/supabase";

function AuthFrame({
  children,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <div className="auth-brand">
          <span>
            <Activity aria-hidden="true" size={19} />
          </span>
          Automation Reliability Console
        </div>
        <div className="auth-story__content">
          <p className="eyebrow">
            Independent technical reference implementation
          </p>
          <h1>Operational confidence for every automation run.</h1>
          <p>
            Signed event ingestion, canonical run state, incidents, controlled
            replay, private artifacts, and tenant-safe audit history.
          </p>
          <ul>
            <li>
              <ShieldCheck aria-hidden="true" size={18} />
              PostgreSQL-enforced organization isolation
            </li>
            <li>
              <KeyRound aria-hidden="true" size={18} />
              One-time credentials and HMAC verification
            </li>
            <li>
              <Activity aria-hidden="true" size={18} />
              Durable processing with live operator updates
            </li>
          </ul>
        </div>
        <p className="auth-story__disclosure">
          All organizations and execution data are fictional.
        </p>
      </section>
      <section className="auth-panel">
        <div className="auth-panel__mark">
          <Activity aria-hidden="true" size={23} />
        </div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {children}
      </section>
    </main>
  );
}

export function SignInPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  if (user) return <Navigate to="/" replace />;

  const signIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame eyebrow="Secure access" title="Sign in to operations">
      <p>Use an authorized organization account to continue.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void signIn();
        }}
      >
        <label>
          Email address
          <span className="input-with-icon">
            <Mail aria-hidden="true" size={16} />
            <input
              autoComplete="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </span>
        </label>
        <label>
          Password
          <span className="input-with-icon">
            <KeyRound aria-hidden="true" size={16} />
            <input
              autoComplete="current-password"
              minLength={10}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </span>
        </label>
        <div className="form-row form-row--between">
          <Link to="/reset-password">Forgot password?</Link>
          <Link to="/sign-up">Create account</Link>
        </div>
        <Button loading={loading} type="submit">
          Sign in
          <ArrowRight aria-hidden="true" size={16} />
        </Button>
      </form>
    </AuthFrame>
  );
}

export function SignUpPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  if (user) return <Navigate to="/" replace />;

  const signUp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) throw error;
      notify("Account created. Check your email if confirmation is enabled.");
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame eyebrow="Controlled registration" title="Create an account">
      <p>
        New accounts start without tenant data until an organization is created.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void signUp();
        }}
      >
        <label>
          Display name
          <input
            maxLength={120}
            minLength={2}
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </label>
        <label>
          Email address
          <input
            autoComplete="email"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            autoComplete="new-password"
            minLength={10}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <p className="form-hint">
          Use upper and lowercase letters, a number, and a symbol.
        </p>
        <Button loading={loading} type="submit">
          Create account
        </Button>
        <Link className="auth-back-link" to="/sign-in">
          Return to sign in
        </Link>
      </form>
    </AuthFrame>
  );
}

export function ResetPasswordPage() {
  const { notify } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const reset = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      });
      if (error) throw error;
      notify("Password reset instructions sent.");
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthFrame eyebrow="Account recovery" title="Reset your password">
      <p>We will send a time-limited recovery link to the account email.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void reset();
        }}
      >
        <label>
          Email address
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <Button loading={loading} type="submit">
          Send recovery link
        </Button>
        <Link className="auth-back-link" to="/sign-in">
          Return to sign in
        </Link>
      </form>
    </AuthFrame>
  );
}

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  useEffect(() => {
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        notify("The authentication link is invalid or expired.", "error");
        void navigate("/sign-in", { replace: true });
      } else {
        const next =
          new URLSearchParams(window.location.search).get("next") ?? "/";
        void navigate(next.startsWith("/") ? next : "/", { replace: true });
      }
    });
  }, [navigate, notify]);
  return (
    <div className="centered-state">
      <p>Completing secure sign in...</p>
    </div>
  );
}

export function UnauthorizedPage() {
  return (
    <main className="standalone-message">
      <ShieldCheck aria-hidden="true" size={28} />
      <p className="eyebrow">Access denied</p>
      <h1>This workspace is outside your permissions.</h1>
      <p>
        Tenant and role access are enforced by PostgreSQL. Return to an
        organization you are authorized to view.
      </p>
      <Link className="button button--primary" to="/">
        Return to dashboard
      </Link>
    </main>
  );
}
