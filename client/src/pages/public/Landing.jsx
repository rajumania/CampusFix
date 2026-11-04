import { Link } from 'react-router-dom';
import { CATEGORIES } from '../../utils/constants.js';

const FEATURES = [
  {
    title: 'Students',
    body: 'Report an issue in under a minute with photographs, category and priority, then follow it from pending to resolved and rate the fix.',
    tone: 'bg-brand-50 text-brand-700',
  },
  {
    title: 'Administrators',
    body: 'Review every complaint in one queue, assign it to the right maintenance staff, retune priority and watch resolution performance on live charts.',
    tone: 'bg-purple-50 text-purple-700',
  },
  {
    title: 'Maintenance staff',
    body: 'See only the work assigned to you, post progress notes for the student and close the task with resolution remarks.',
    tone: 'bg-emerald-50 text-emerald-700',
  },
];

const STEPS = [
  'Student submits a complaint',
  'Administrator reviews the queue',
  'Complaint is assigned to staff',
  'Staff update the progress',
  'Issue is marked resolved',
  'Student rates the resolution',
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 7 5 12l4 5M15 7l4 5-4 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-lg font-bold tracking-tight">CampusFix</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link to="/login" className="btn-ghost">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary">
              Report an issue
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 ring-1 ring-brand-100">
                MERN stack campus management platform
              </span>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
                Campus problems reported once,{' '}
                <span className="text-brand-600">tracked to the fix.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-slate-600">
                A projector that will not switch on, a hostel wing without hot water, a dead Wi-Fi access
                point — CampusFix turns every complaint into an assigned, measurable work order instead of a
                conversation that dies at the office desk.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="btn-primary px-5 py-2.5">
                  Create a student account
                </Link>
                <Link to="/login" className="btn-secondary px-5 py-2.5">
                  I already have an account
                </Link>
              </div>
            </div>

            <div className="card p-6 shadow-lg">
              <p className="text-sm font-semibold text-slate-500">Complaint categories</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <span
                    key={category}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
                  >
                    {category}
                  </span>
                ))}
              </div>
              <p className="mt-6 text-sm font-semibold text-slate-500">Resolution workflow</p>
              <ol className="mt-3 space-y-2">
                {STEPS.map((step, index) => (
                  <li key={step} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="card p-6">
                <span className={`inline-flex rounded-lg px-3 py-1 text-sm font-bold ${feature.tone}`}>
                  {feature.title}
                </span>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Every status change is written to an audit trail.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Who reported it, who assigned it, who changed the priority and what fixed it — students, staff and
            administrators all see the same history, scoped to what their role is allowed to access.
          </p>
          <Link to="/register" className="btn-primary mt-7 px-5 py-2.5">
            Start a report
          </Link>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        CampusFix · Built with React, Node.js, Express and MongoDB as a MERN stack training project.
      </footer>
    </div>
  );
}
