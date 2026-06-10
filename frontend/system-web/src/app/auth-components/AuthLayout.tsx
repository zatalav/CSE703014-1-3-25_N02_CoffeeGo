import React from 'react';
import { Coffee, ShieldCheck, Store, TrendingUp } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  headline?: string;
  subline?: string;
}

export function AuthLayout({
  children,
  headline = 'Quản trị vận hành Coffee Shop',
  subline = 'Theo dõi chi nhánh, kho, nhân sự và báo cáo từ một bảng điều khiển tập trung.',
}: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-[#f6f3ee] text-slate-950" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="grid min-h-screen lg:grid-cols-[minmax(420px,0.95fr)_minmax(520px,1.05fr)]">
        <section className="relative hidden overflow-hidden bg-[#0F4761] px-10 py-8 text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_78%_74%,rgba(245,158,11,0.30),transparent_36%)]" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#0F4761] shadow-lg">
              <Coffee size={23} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.22em]">CoffeeGo Admin</p>
              <p className="text-xs text-white/60">Operations console</p>
            </div>
          </div>

          <div className="relative z-10 flex flex-1 flex-col justify-center">
            <div className="max-w-xl">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-sm text-white/80">
                <ShieldCheck size={16} />
                Đăng nhập bảo mật cho nội bộ
              </div>
              <h1 className="max-w-[11ch] text-5xl font-black leading-[1.02] xl:text-6xl">{headline}</h1>
              <p className="mt-6 max-w-md text-base leading-7 text-white/70">{subline}</p>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-3">
            {[
              { icon: Store, value: '12+', label: 'Chi nhánh' },
              { icon: TrendingUp, value: '98%', label: 'Theo dõi' },
              { icon: ShieldCheck, value: '24/7', label: 'Vận hành' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <Icon className="mb-3 text-white/70" size={18} />
                  <p className="text-2xl font-black">{item.value}</p>
                  <p className="mt-1 text-xs text-white/55">{item.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex min-h-screen flex-col">
          <header className="flex items-center gap-3 px-6 py-5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F4761] text-white">
              <Coffee size={21} />
            </div>
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#0F4761]">CoffeeGo Admin</p>
              <p className="text-xs text-slate-500">Operations console</p>
            </div>
          </header>

          <div className="flex flex-1 items-center justify-center px-5 pb-8 pt-2 sm:px-8 lg:p-12">
            <div className="w-full max-w-[460px]">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
