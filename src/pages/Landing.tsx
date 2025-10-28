import { Link } from 'react-router-dom';
import LightRays from '@/components/LightRays';
import DonationButton from '@/components/DonationButton';
import { useAuth } from '@/hooks/useAuth';

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <LightRays
          raysOrigin="top-center"
          raysColor="#38bdf8"
          raysSpeed={1.2}
          lightSpread={1}
          rayLength={1.5}
          followMouse
          mouseInfluence={0.2}
          noiseAmount={0.2}
          distortion={0.08}
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="px-6 md:px-12 py-6 flex items-center justify-between">
          <div className="text-2xl font-semibold text-sky-100 tracking-tight">
            Experiment Visualizer
          </div>
          <div className="flex items-center gap-4">
            <DonationButton />
            {isAuthenticated ? (
              <Link
                to="/app"
                className="px-4 py-2 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-900 font-medium transition-colors"
              >
                Enter Workspace
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-md border border-sky-300 text-sky-100 hover:bg-sky-300/10 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 px-6 md:px-12 py-12">
          <div className="max-w-5xl mx-auto grid gap-12 md:grid-cols-[1.2fr_0.8fr] items-center">
            <div className="space-y-8">
              <div>
                <span className="inline-flex items-center px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-300 bg-sky-300/10 rounded-full mb-4">
                  Interactive Science Toolkit
                </span>
                <h1 className="text-4xl md:text-5xl font-bold text-sky-50 leading-tight">
                  Build and iterate rich experiment simulations with AI assistance.
                </h1>
              </div>
              <p className="text-slate-200 text-lg leading-relaxed max-w-2xl">
                Describe the experiment you have in mind and let our AI co-pilot craft responsive, animated demos
                complete with parameter controls, detailed explanations, and physics-aware visuals. Refine in chat,
                collect feedback, and share instantly.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to={isAuthenticated ? '/app' : '/register'}
                  className="px-5 py-3 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold transition-colors"
                >
                  {isAuthenticated ? 'Resume Experiments' : 'Create Account'}
                </Link>
                <a
                  href="#features"
                  className="px-5 py-3 rounded-md border border-sky-400 text-sky-100 hover:bg-sky-300/10 transition-colors"
                >
                  Explore Features
                </a>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur">
              <h2 className="text-sky-100 text-lg font-semibold">Why teams use Experiment Visualizer</h2>
              <ul className="space-y-4 text-sm text-slate-200">
                <li>
                  <span className="text-sky-300 font-medium">AI-guided creation:</span> Generate interactive demos with
                  validated domain knowledge and customizable layouts.
                </li>
                <li>
                  <span className="text-sky-300 font-medium">Conversation-first workflow:</span> Iterate through chat,
                  keep experiments organized, and revisit any simulation instantly.
                </li>
                <li>
                  <span className="text-sky-300 font-medium">Survey-ready insights:</span> Collect structured reactions
                  from learners or stakeholders to improve your visualizations.
                </li>
              </ul>
              <div className="pt-4 border-t border-slate-800">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Trusted by</p>
                <div className="flex items-center gap-4 text-slate-300/80 text-sm">
                  <span>STEM tutors</span>
                  <span className="w-1 h-1 rounded-full bg-slate-500" />
                  <span>Data storytellers</span>
                  <span className="w-1 h-1 rounded-full bg-slate-500" />
                  <span>Learning labs</span>
                </div>
              </div>
            </div>
          </div>

          <section id="features" className="mt-24 grid gap-8 md:grid-cols-3">
            {featureCards.map((feature) => (
              <div
                key={feature.title}
                className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 space-y-3 text-slate-200"
              >
                <div className="text-sky-300 text-sm font-semibold uppercase tracking-wide">{feature.category}</div>
                <h3 className="text-xl font-semibold text-sky-50">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-slate-300">{feature.description}</p>
              </div>
            ))}
          </section>
        </main>

        <footer className="px-6 md:px-12 py-10 border-t border-slate-800 text-sm text-slate-400">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <p>Built for explorative learning with respect for reproducibility.</p>
            <div className="flex items-center gap-4">
              <Link to="/login" className="hover:text-sky-200 transition-colors">
                Sign In
              </Link>
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <Link to="/register" className="hover:text-sky-200 transition-colors">
                Create Account
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

const featureCards = [
  {
    category: 'Collaboration',
    title: 'Shared experiment spaces',
    description:
      'Every conversation stays organized with timestamps, experiment snapshots, and editable prompts to keep teammates aligned.',
  },
  {
    category: 'Visualization',
    title: 'Dynamic interfaces',
    description:
      'HTML, CSS, and JavaScript animations tailored to your prompt complete with equation rendering, control panels, and annotations.',
  },
  {
    category: 'Insights',
    title: 'Feedback ready surveys',
    description:
      'Distribute autogenerated surveys after each demo to capture comprehension scores and qualitative feedback effortlessly.',
  },
];
