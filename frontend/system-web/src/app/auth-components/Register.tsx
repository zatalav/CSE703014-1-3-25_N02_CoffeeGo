import { useState } from 'react';
import { Eye, EyeOff, ArrowRight, Check, User, Mail, Phone, Lock } from 'lucide-react';
import { Link } from 'react-router';
import { AuthLayout } from './AuthLayout';

const STEPS = ['Thông tin', 'Mật khẩu', 'Xác nhận'];

function FloatingInput({
  id,
  name,
  label,
  type,
  value,
  onChange,
  rightElement,
  error,
  success,
}: {
  id: string;
  name?: string;
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  rightElement?: React.ReactNode;
  error?: boolean;
  success?: boolean;
}) {
  const borderColor = error
    ? '#EF4444'
    : success
    ? '#22C55E'
    : undefined;

  return (
    <div className="relative">
      <input
        id={id}
        name={name || id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder=" "
        required
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          paddingRight: rightElement ? '3rem' : '1rem',
          borderColor: borderColor,
        }}
        className={`peer w-full pt-5 pb-2 px-4 bg-white border-2 rounded-2xl text-gray-900 text-sm outline-none transition-all duration-200 placeholder-transparent
          ${!error && !success ? 'border-gray-200 focus:border-red-500' : ''}
          ${error ? 'focus:border-red-400' : ''}
          ${success ? 'focus:border-green-400' : ''}
          focus:ring-0`}
      />
      <label
        htmlFor={id}
        className={`absolute left-4 top-3.5 text-xs transition-all duration-200 pointer-events-none
          peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm
          peer-focus:top-2 peer-focus:text-xs peer-focus:text-red-500`}
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 600,
          color: error ? '#EF4444' : success ? '#22C55E' : '#9CA3AF',
        }}
      >
        {label}
      </label>
      {rightElement && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {rightElement}
        </div>
      )}
    </div>
  );
}

function StepBadge({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-3"
      style={{
        background: 'rgba(15,71,97,0.08)',
        color: '#0F4761',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 700,
      }}
    >
      <Icon className="w-3 h-3" />
      {label}
    </div>
  );
}

export default function Register() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const pwMatch =
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) setStep(step + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) { alert('Vui lòng đồng ý với điều khoản!'); return; }
    if (!pwMatch) { alert('Mật khẩu xác nhận không khớp!'); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1300));
    setLoading(false);
    alert('Đăng ký thành công!');
  };

  const stepIcons = [User, Lock, Check];

  return (
    <AuthLayout
      headline={'Gia nhập\ncộng đồng\ncà phê\ncủa chúng tôi.'}
      subline="Đăng ký để nhận ưu đãi độc quyền"
    >
      {/* Heading */}
      <div className="mb-6">
        <p
          className="text-xs tracking-widest uppercase mb-2"
          style={{ color: '#0F4761', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Tạo tài khoản mới ✨
        </p>
        <h1
          className="text-3xl text-gray-900"
          style={{ fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Đăng ký
        </h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all duration-300"
                style={{
                  background: i < step ? '#22C55E' : i === step ? '#0F4761' : '#E5E7EB',
                  color: i <= step ? 'white' : '#9CA3AF',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                }}
              >
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span
                className="text-xs hidden sm:block"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: i === step ? 700 : 400,
                  color: i === step ? '#0F4761' : i < step ? '#22C55E' : '#9CA3AF',
                }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-0.5 w-8 rounded-full transition-all duration-300"
                style={{ background: i < step ? '#22C55E' : '#E5E7EB' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Personal info */}
      {step === 0 && (
        <form onSubmit={handleNext} className="space-y-4">
          <StepBadge icon={User} label="Thông tin cá nhân" />
          <FloatingInput
            id="fullName"
            label="Họ và tên đầy đủ"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
          />
          <FloatingInput
            id="email"
            label="Địa chỉ email"
            type="email"
            value={formData.email}
            onChange={handleChange}
          />
          <FloatingInput
            id="phone"
            label="Số điện thoại"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
          />
          <button
            type="submit"
            className="w-full py-4 rounded-2xl text-white flex items-center justify-center gap-2 group transition-all duration-200 active:scale-[0.98] mt-2"
            style={{
              background: 'linear-gradient(135deg, #0F4761 0%, #0d3e54 100%)',
              boxShadow: '0 8px 24px rgba(15,71,97,0.28)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: '15px',
            }}
          >
            Tiếp theo
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      )}

      {/* Step 1: Password */}
      {step === 1 && (
        <form onSubmit={handleNext} className="space-y-4">
          <StepBadge icon={Lock} label="Thiết lập mật khẩu" />

          <FloatingInput
            id="password"
            name="password"
            label="Mật khẩu (tối thiểu 8 ký tự)"
            type={showPw ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            rightElement={
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-gray-400 hover:text-red-500 transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <FloatingInput
            id="confirmPassword"
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            type={showCpw ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange}
            error={formData.confirmPassword.length > 0 && !pwMatch}
            success={pwMatch}
            rightElement={
              <>
                {formData.confirmPassword.length > 0 && pwMatch && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
                <button type="button" onClick={() => setShowCpw(!showCpw)} className="text-gray-400 hover:text-red-500 transition-colors">
                  {showCpw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </>
            }
          />

          {/* Password strength */}
          {formData.password.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex-1 h-1 rounded-full transition-all duration-300"
                    style={{
                      background:
                        formData.password.length >= i * 3
                          ? i <= 1 ? '#EF4444' : i <= 2 ? '#F97316' : i <= 3 ? '#EAB308' : '#22C55E'
                          : '#E5E7EB',
                    }}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {formData.password.length < 4 ? 'Yếu' : formData.password.length < 8 ? 'Trung bình' : formData.password.length < 12 ? 'Mạnh' : 'Rất mạnh'}
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-all active:scale-[0.98]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '14px' }}
            >
              ← Quay lại
            </button>
            <button
              type="submit"
              className="flex-1 py-4 rounded-2xl text-white flex items-center justify-center gap-2 group transition-all duration-200 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #0F4761 0%, #0d3e54 100%)',
                boxShadow: '0 8px 24px rgba(15,71,97,0.28)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              Tiếp theo
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Confirm & Submit */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <StepBadge icon={Check} label="Xác nhận thông tin" />

          {/* Summary card */}
          <div
            className="rounded-2xl p-4 space-y-3"
            style={{ background: 'rgba(15,71,97,0.04)', border: '1.5px solid rgba(15,71,97,0.12)' }}
          >
            {[
              { icon: User, label: 'Họ tên', value: formData.fullName },
              { icon: Mail, label: 'Email', value: formData.email },
              { icon: Phone, label: 'SĐT', value: formData.phone },
              { icon: Lock, label: 'Mật khẩu', value: '••••••••' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(15,71,97,0.1)' }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: '#0F4761' }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 }}>{label}</p>
                  <p className="text-sm text-gray-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>{value || '—'}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Terms */}
          <label className="flex items-start gap-3 cursor-pointer">
            <div
              className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
              style={{
                background: agreeTerms ? '#0F4761' : 'white',
                borderColor: agreeTerms ? '#0F4761' : '#D1D5DB',
              }}
              onClick={() => setAgreeTerms(!agreeTerms)}
            >
              {agreeTerms && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm text-gray-600 leading-relaxed" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Tôi đồng ý với{' '}
              <a href="#" style={{ color: '#0F4761', fontWeight: 700 }}>Điều khoản dịch vụ</a>{' '}
              và{' '}
              <a href="#" style={{ color: '#0F4761', fontWeight: 700 }}>Chính sách bảo mật</a>
            </span>
          </label>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-all active:scale-[0.98]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '14px' }}
            >
              ← Quay lại
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 rounded-2xl text-white flex items-center justify-center gap-2 group transition-all duration-200 active:scale-[0.98] disabled:opacity-70"
              style={{
                background: 'linear-gradient(135deg, #0F4761 0%, #0d3e54 100%)',
                boxShadow: '0 8px 24px rgba(15,71,97,0.28)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Hoàn tất</>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Login link */}
      <p
        className="text-center text-sm text-gray-500 mt-5"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Đã có tài khoản?{' '}
        <Link to="/login" style={{ color: '#0F4761', fontWeight: 700 }}>
          Đăng nhập →
        </Link>
      </p>
    </AuthLayout>
  );
}
