import { useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Mail, Phone } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { CUSTOMER_WEB_URL, canAccessPath, encodeTransferredSession, isExternalUrl, roleHomePath, useAuth } from '../../lib/auth';
import { AuthLayout } from './AuthLayout';

type LoginTab = 'email' | 'phone';

function Field({
  id,
  label,
  type,
  value,
  onChange,
  rightElement,
  maxLength,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  rightElement?: React.ReactNode;
  maxLength?: number;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          required
          className="h-13 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-[15px] font-semibold text-slate-950 shadow-sm outline-none transition focus:border-[#0F4761] focus:ring-4 focus:ring-[#0F4761]/10"
        />
        {rightElement && <div className="absolute right-4 top-1/2 -translate-y-1/2">{rightElement}</div>}
      </div>
    </label>
  );
}

function friendlyError(message: string) {
  if (message.includes('Không kết nối được máy chủ')) return message;
  if (message.includes('500')) return 'Máy chủ đăng nhập đang lỗi. Hãy kiểm tra auth-service port 8081 và database.';
  if (message.toLowerCase().includes('invalid')) return 'Email/số điện thoại hoặc mật khẩu không đúng.';
  return message || 'Đăng nhập thất bại.';
}

export default function Login() {
  const [tab, setTab] = useState<LoginTab>('email');
  const [email, setEmail] = useState('Admin@gmail.com');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('Admin123@');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const identifier = tab === 'email' ? email.trim() : phone.trim();
      const session = await login({ identifier, password: password.trim() });
      const state = location.state as { from?: { pathname?: string } } | null;
      const from = state?.from?.pathname;
      const roleName = session.userInfo?.roleName || session.role;
      const homePath = roleHomePath(roleName);
      const target = canAccessPath(roleName, from) ? from! : homePath;
      if (isExternalUrl(target)) {
        window.location.assign(`${CUSTOMER_WEB_URL}/#auth=${encodeTransferredSession(session)}`);
        return;
      }
      navigate(target, { replace: true });
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : 'Đăng nhập thất bại.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="rounded-[28px] border border-white bg-white/92 p-6 shadow-[0_24px_70px_rgba(35,23,18,0.14)] sm:p-8">
        <div className="mb-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#0F4761]">Chào mừng trở lại</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.02em] text-slate-950">Đăng nhập</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Dùng tài khoản quản trị để vào bảng điều khiển Coffee Admin.</p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
          {(['email', 'phone'] as LoginTab[]).map((item) => {
            const active = tab === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition ${
                  active ? 'bg-white text-[#0F4761] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {item === 'email' ? <Mail size={16} /> : <Phone size={16} />}
                {item === 'email' ? 'Tài khoản' : 'Số điện thoại'}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'email' ? (
            <Field id="email" label="Tài khoản hoặc email" type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
          ) : (
            <Field id="phone" label="Số điện thoại" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={10} />
          )}

          <Field
            id="password"
            label="Mật khẩu"
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            rightElement={
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-slate-400 transition hover:text-[#0F4761]" aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                {showPw ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            }
          />

          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={() => setRemember(!remember)} className="flex items-center gap-3 text-sm font-bold text-slate-600">
              <span className={`relative h-6 w-11 rounded-full transition ${remember ? 'bg-[#0F4761]' : 'bg-slate-300'}`}>
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${remember ? 'left-6' : 'left-1'}`} />
              </span>
              Ghi nhớ
            </button>
            <Link to="/forgot-password" className="text-sm font-extrabold text-[#0F4761] hover:text-[#0d3e54]">
              Quên mật khẩu?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#0F4761] text-[15px] font-black text-white shadow-[0_14px_30px_rgba(15,71,97,0.24)] transition hover:bg-[#0d3e54] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <>Đăng nhập <ArrowRight size={18} /></>}
          </button>
        </form>

      </div>
    </AuthLayout>
  );
}
