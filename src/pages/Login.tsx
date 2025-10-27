import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { useAuth, useAuthActions } from '@/hooks/useAuth';
import { useCaptcha } from '@/hooks/useCaptcha';

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, hydrated } = useAuth();
  const { setAuth, clearAuth } = useAuthActions();
  const { captcha, loading: captchaLoading, error: captchaError, refreshCaptcha } = useCaptcha();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hydrated && isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!captcha?.id) {
      setError('请先加载验证码');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await apiClient.login({
        email,
        password,
        captchaId: captcha.id,
        captchaAnswer,
      });

      if (response.success && response.data) {
        setAuth(response.data);
        navigate('/app', { replace: true });
        return;
      }

      setError(response.error || '登录失败，请重试');
      await refreshCaptcha();
      setCaptchaAnswer('');
      clearAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录请求失败');
      await refreshCaptcha();
      setCaptchaAnswer('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0f172a' }}>
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur">
        <h1 className="text-2xl font-semibold text-sky-100 text-center mb-6">登录你的实验工作台</h1>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm text-slate-300 mb-1" htmlFor="email">
              邮箱
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1" htmlFor="password">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
              placeholder="至少 8 位字符"
              required
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-slate-300" htmlFor="captcha">
              验证码
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  id="captcha"
                  value={captchaAnswer}
                  onChange={(event) => setCaptchaAnswer(event.target.value)}
                  className="w-full px-4 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  placeholder="输入图中字符"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => refreshCaptcha()}
                disabled={captchaLoading}
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wide rounded-md border border-sky-400 text-sky-200 hover:bg-sky-400/10 disabled:opacity-60"
              >
                刷新
              </button>
            </div>
            <div className="h-16 flex items-center justify-center rounded-md bg-slate-800 border border-slate-700">
              {captcha?.svg ? (
                <img src={captcha.svg} alt="验证码" className="max-h-14" />
              ) : (
                <span className="text-sm text-slate-400">
                  {captchaError || '加载验证码中...'}
                </span>
              )}
            </div>
          </div>

          {error && <div className="text-sm text-red-400 bg-red-400/10 border border-red-500/40 px-3 py-2 rounded-md">{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold transition-colors disabled:opacity-60"
          >
            {submitting ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-400 text-center">
          还没有账号？{' '}
          <Link to="/register" className="text-sky-300 hover:text-sky-200">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}
