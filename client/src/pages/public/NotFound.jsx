import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
      <p className="text-6xl font-extrabold tracking-tight text-brand-600">404</p>
      <h1 className="text-xl font-bold text-ink">That page does not exist</h1>
      <p className="max-w-sm text-sm text-slate-500">
        The link may be out of date, or the page belongs to a different role than the account you signed in with.
      </p>
      <div className="mt-2 flex gap-2">
        <Link to="/" className="btn-secondary">
          Back to landing
        </Link>
        <Link to="/login" className="btn-primary">
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
