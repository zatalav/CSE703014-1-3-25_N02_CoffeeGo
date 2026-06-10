import { useState } from 'react';
import { Mail, ArrowLeft, ArrowRight, CheckCircle, RefreshCw, Shield } from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../../lib/api';
import { AuthLayout } from './AuthLayout';

export default function ForgotPassword() {
  const [email, setEmail] = useState('Admin@gmail.com');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post<void>('/auth/forgot-password', { identifier: email.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi email');
      setLoading(false);
      return;
    }
    setLoading(false);
    // Countdown 60s
    let t = 60;
    setCountdown(t);
    const interval = setInterval(() => {
      t -= 1;
      setCountdown(t);
      if (t === 0) clearInterval(interval);
    }, 1000);
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError('');
    setResending(true);
    try {
      await api.post<void>('/auth/forgot-password', { identifier: email.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi email');
      setResending(false);
      return;
    }
    setResending(false);
    let t = 60;
    setCountdown(t);
    const interval = setInterval(() => {
      t -= 1;
      setCountdown(t);
      if (t === 0) clearInterval(interval);
    }, 1000);
  };

  if (submitted) {
    return (
      <AuthLayout
        headline={'Hãy kiểm tra\nhộp thư\ncủa bạn.'}
        subline="Mật khẩu mới đã được gửi"
      >
        <div className="mb-8">
          <p
            className="text-xs tracking-widest uppercase mb-2"
            style={{ color: '#0F4761', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Email đã gửi ✅
          </p>
          <h1
            className="text-3xl text-gray-900"
            style={{ fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Kiểm tra email
          </h1>
        </div>

        {/* Success illustration */}
        <div className="flex flex-col items-center py-6">
          <div
            className="relative w-24 h-24 rounded-full flex items-center justify-center mb-5"
            style={{ background: 'linear-gradient(135deg, rgba(15,71,97,0.08), rgba(15,71,97,0.02))' }}
          >
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: 'rgba(15,71,97,0.06)' }}
            />
            <CheckCircle className="w-10 h-10" style={{ color: '#0F4761' }} />
          </div>

          <p className="text-gray-500 text-sm text-center mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Chúng tôi đã gửi mật khẩu mới tới
          </p>

          <div
            className="flex items-center gap-2.5 px-5 py-3 rounded-2xl mb-6"
            style={{
              background: 'rgba(15,71,97,0.06)',
              border: '1.5px solid rgba(15,71,97,0.15)',
            }}
          >
            <Mail className="w-4 h-4 flex-shrink-0" style={{ color: '#0F4761' }} />
            <span
              className="text-sm"
              style={{ color: '#0F4761', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              userstest2212@gmail.com
            </span>
          </div>

          {/* Tips */}
          <div
            className="w-full rounded-2xl p-4 space-y-2.5"
            style={{ background: '#F8F9FA' }}
          >
            {[
              { icon: '📥', text: 'Kiểm tra hộp thư đến' },
              { icon: '🗂️', text: 'Xem thư mục Spam / Quảng cáo' },
              { icon: '⏱️', text: 'Mật khẩu mới có hiệu lực ngay sau khi gửi' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-base">{icon}</span>
                <span
                  className="text-sm text-gray-600"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 }}
                >
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 mt-2">
          <Link
            to="/login"
            className="w-full py-4 rounded-2xl text-white flex items-center justify-center gap-2 group transition-all duration-200 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #0F4761 0%, #0d3e54 100%)',
              boxShadow: '0 8px 24px rgba(15,71,97,0.28)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: '15px',
              display: 'flex',
            }}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Quay lại đăng nhập
          </Link>

          <button
            onClick={handleResend}
            disabled={countdown > 0 || resending}
            className="w-full py-3.5 rounded-2xl border-2 flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-sm"
            style={{
              borderColor: countdown > 0 ? '#E5E7EB' : '#0F4761',
              color: countdown > 0 ? '#9CA3AF' : '#0F4761',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              cursor: countdown > 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {resending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mật khẩu mới'}
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      headline={'Quên mật\nkhẩu?\nĐừng lo,\nchúng tôi giúp.'}
      subline="Đặt lại trong vài giây"
    >
      {/* Back link */}
      <Link
        to="/login"
        className="inline-flex items-center gap-2 mb-8 group transition-colors"
        style={{
          color: '#9CA3AF',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 600,
          fontSize: '14px',
        }}
      >
        <div
          className="w-8 h-8 rounded-xl border-2 border-gray-200 flex items-center justify-center group-hover:border-red-400 group-hover:text-red-500 transition-all"
          style={{ color: '#9CA3AF' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </div>
        <span className="group-hover:text-red-500 transition-colors">Quay lại</span>
      </Link>

      {/* Heading */}
      <div className="mb-8">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-3"
          style={{
            background: 'rgba(15,71,97,0.08)',
            color: '#0F4761',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
          }}
        >
          <Shield className="w-3 h-3" />
          Bảo mật tài khoản
        </div>
        <h1
          className="text-3xl text-gray-900"
          style={{ fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Quên mật khẩu?
        </h1>
        <p
          className="text-gray-500 text-sm mt-2 leading-relaxed"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Nhập email admin, hệ thống sẽ tạo mật khẩu mới và gửi về userstest2212@gmail.com.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email input */}
        <div className="relative">
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder=" "
            required
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="peer w-full pt-5 pb-2 px-4 bg-white border-2 border-gray-200 rounded-2xl text-gray-900 text-sm outline-none focus:border-red-500 focus:ring-0 transition-all placeholder-transparent"
          />
          <label
            htmlFor="email"
            className="absolute left-4 top-3.5 text-xs text-gray-400 transition-all duration-200 pointer-events-none
              peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400
              peer-focus:top-2 peer-focus:text-xs peer-focus:text-red-500"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}
          >
            Email admin
          </label>
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Mail className="w-4 h-4 text-gray-300" />
          </div>
        </div>

        {/* CTA */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl text-white flex items-center justify-center gap-2 group transition-all duration-200 active:scale-[0.98] disabled:opacity-70"
          style={{
            background: 'linear-gradient(135deg, #0F4761 0%, #0d3e54 100%)',
            boxShadow: '0 8px 24px rgba(15,71,97,0.28)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: '15px',
          }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Gửi mật khẩu mới
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      {/* Security note */}
      <div
        className="mt-6 flex gap-3 p-4 rounded-2xl"
        style={{ background: 'rgba(15,71,97,0.04)', border: '1px solid rgba(15,71,97,0.1)' }}
      >
        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#0F4761' }} />
        <p
          className="text-xs text-gray-500 leading-relaxed"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Mật khẩu mới chỉ được gửi tới email khôi phục admin đã cấu hình.
        </p>
      </div>

      <p
        className="text-center text-sm text-gray-500 mt-5"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Nhớ mật khẩu rồi?{' '}
        <Link to="/login" style={{ color: '#0F4761', fontWeight: 700 }}>
          Đăng nhập →
        </Link>
      </p>
    </AuthLayout>
  );
}
