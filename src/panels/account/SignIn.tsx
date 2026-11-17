import { useState, type FormEvent } from 'react';
import { supabaseIsLocal } from '../../data/source';
import { useSignIn, useSignOut } from '../../state/serverData';

/** Local Supabase catches every email in its test inbox (supabase/config.toml, [inbucket]). */
const LOCAL_INBOX = 'http://127.0.0.1:54324';

/** Email a sign-in link; no passwords. */
export function SignInCard() {
  const signIn = useSignIn();
  const [email, setEmail] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim()) signIn.mutate(email.trim());
  };

  if (signIn.isSuccess) {
    return (
      <div className="card gate" role="status">
        <h2>Check your email</h2>
        <p>
          We sent a sign-in link to <b>{signIn.variables}</b>. Open it in this browser to continue.
        </p>
        {supabaseIsLocal && (
          <p className="sub">
            Running Supabase locally: the email is in the test inbox at <a href={LOCAL_INBOX}>{LOCAL_INBOX}</a>.
          </p>
        )}
        <button className="link" type="button" onClick={() => signIn.reset()}>
          Use another email
        </button>
      </div>
    );
  }

  return (
    <form className="card gate" onSubmit={submit}>
      <h2>Sign in to Storey</h2>
      <p>Managers and directors sign in with their work email. We'll email you a link, so there's no password to remember.</p>
      <label className="field">
        <span>Work email</span>
        <input type="email" name="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <button className="btn primary" type="submit" disabled={signIn.isPending}>
        {signIn.isPending ? 'Sending…' : 'Email me a sign-in link'}
      </button>
      {signIn.isError && (
        <div className="note bad" role="alert">
          Couldn't send the link: {signIn.error.message}
        </div>
      )}
    </form>
  );
}

/** Signed in, but the email doesn't belong to a manager or director. */
export function NoAccessCard({ email }: { email: string }) {
  const signOut = useSignOut();
  return (
    <div className="card gate" role="alert">
      <h2>This account isn't set up for Storey</h2>
      <p>
        You're signed in as <b>{email}</b>, but that email doesn't belong to a manager or director. Ask a director to add it to your employee
        record, then sign in again.
      </p>
      <button className="btn" type="button" onClick={() => signOut.mutate()} disabled={signOut.isPending}>
        Sign out
      </button>
    </div>
  );
}
