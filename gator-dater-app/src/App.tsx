import { FormEvent, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import './index.css';

type Mode = 'signin' | 'signup';

type FormState = {
  fullName: string;
  email: string;
  password: string;
};

type UserProfile = {
  fullName: string;
  email: string;
  createdAt?: unknown;
};

const initialForm: FormState = {
  fullName: '',
  email: '',
  password: '',
};

export default function App() {
  const [mode, setMode] = useState<Mode>('signup');
  const [form, setForm] = useState<FormState>(initialForm);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState('Create an account to get started.');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setError('');

      if (!user || !db) {
        setProfile(null);
        return;
      }

      const snapshot = await getDoc(doc(db, 'users', user.uid));
      setProfile(snapshot.exists() ? (snapshot.data() as UserProfile) : null);
    });
  }, []);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isFirebaseConfigured || !auth || !db) {
      setError('Add your Firebase web config to .env before using auth.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        const credential = await createUserWithEmailAndPassword(
          auth,
          form.email,
          form.password,
        );

        await setDoc(doc(db, 'users', credential.user.uid), {
          fullName: form.fullName,
          email: form.email,
          createdAt: serverTimestamp(),
        });

        setStatus('Account created and saved to Firestore.');
      } else {
        const credential = await signInWithEmailAndPassword(
          auth,
          form.email,
          form.password,
        );

        const snapshot = await getDoc(doc(db, 'users', credential.user.uid));
        setProfile(snapshot.exists() ? (snapshot.data() as UserProfile) : null);
        setStatus('Signed in successfully.');
      }

      resetForm();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) {
      return;
    }

    await signOut(auth);
    setProfile(null);
    setStatus('Signed out.');
  };

  if (currentUser) {
    return (
      <main className="app-shell">
        <section className="home-card">
          <div className="home-hero">
            <div>
              <p className="eyebrow">Gator Dater</p>
              <h1>Home</h1>
              <p className="lead">
                You are signed in and ready to keep building the app.
              </p>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>

          <section className="welcome-panel">
            <p className="account-label">Welcome</p>
            <h2>{profile?.fullName || currentUser.email}</h2>
            <p className="account-detail">{currentUser.email}</p>
          </section>

          <section className="home-grid">
            <article className="home-tile">
              <p className="account-label">Account</p>
              <h3>Profile saved in Firestore</h3>
              <p>
                Your account record is loaded from the
                <code> users/{currentUser.uid} </code>
                document.
              </p>
            </article>

            <article className="home-tile">
              <p className="account-label">Next step</p>
              <h3>Start building your dating app flow</h3>
              <p>
                This home page is now the post-login landing view. You can add
                matches, chat, onboarding, or profile setup here next.
              </p>
            </article>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="auth-card">
        <div className="brand-row">
          <div>
            <p className="eyebrow">Gator Dater</p>
            <h1>Sign up and sign in with Firebase.</h1>
          </div>
          <div className="mode-switch" aria-label="Authentication mode">
            <button
              type="button"
              className={mode === 'signup' ? 'mode-pill active' : 'mode-pill'}
              onClick={() => setMode('signup')}
            >
              Sign Up
            </button>
            <button
              type="button"
              className={mode === 'signin' ? 'mode-pill active' : 'mode-pill'}
              onClick={() => setMode('signin')}
            >
              Sign In
            </button>
          </div>
        </div>

        {!isFirebaseConfigured ? (
          <div className="notice warning">
            Firebase is not configured yet. Add your keys to
            <code> gator-dater-app/.env </code>
            using
            <code> .env.example </code>
            first.
          </div>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' ? (
            <label>
              Full name
              <input
                type="text"
                value={form.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
                placeholder="Avery Johnson"
                required
              />
            </label>
          ) : null}

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="gator@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </label>

          <button className="submit-button" type="submit" disabled={loading}>
            {loading
              ? 'Working...'
              : mode === 'signup'
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <p className="status-text">{status}</p>
        {error ? <p className="error-text">{error}</p> : null}
      </section>
    </main>
  );
}
