import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, ShieldCheck, Wrench, ArrowRight } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/authStore";
import { mockUsers } from "@/data/users";
import { initials } from "@/lib/utils";

const demoAccounts = [
  { id: "u-admin", label: "Admin", icon: ShieldCheck, desc: "Full access" },
  { id: "u-tech", label: "Technician", icon: Wrench, desc: "Field jobs only" },
];

export default function Login() {
  const { currentUser, login, loginAsDemo, error } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (currentUser) return <Navigate to="/" replace />;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login(email, password);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden brand-gradient lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 animate-swirl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-white/10 animate-swirl" />

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center gap-3">
            <img src="/images/gmic-logo.png" alt="GMIC CARES+" className="h-14 w-auto rounded-lg bg-white/90 p-1.5" />
            <div className="leading-none text-white">
              <p className="font-display text-lg font-bold">GMIC CARES+</p>
              <p className="text-xs uppercase tracking-wider text-white/80">CRM Platform</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="max-w-md text-white"
        >
          <h1 className="font-display text-4xl font-bold leading-tight">
            Cooling Lives.
            <br />
            Warming Hearts.
          </h1>
          <p className="mt-4 text-white/85">
            One place for every client, unit, and job — replacing scattered chats and spreadsheets with a single
            source of truth for the whole GMIC team.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/90">
            <li className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 shrink-0" /> Track every unit by serial number, indoors and out
            </li>
            <li className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 shrink-0" /> Full inquiry-to-installation sales pipeline
            </li>
            <li className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 shrink-0" /> Field-ready technician scheduling
            </li>
          </ul>
        </motion.div>

        <p className="text-xs text-white/60">© 2026 GMIC CARES+. Internal operations platform.</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-ink-50 px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/images/gmic-logo.png" alt="GMIC CARES+" className="h-11 w-auto" />
            <div className="leading-none">
              <p className="font-display text-base font-bold text-ink-900">GMIC CARES+</p>
              <p className="text-[10px] uppercase tracking-wider text-ink-500">CRM Platform</p>
            </div>
          </div>

          <h2 className="font-display text-2xl font-semibold text-ink-900">Sign in</h2>
          <p className="mt-1 text-sm text-ink-500">Enter your credentials to access the CRM.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@gmiccares.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-md bg-brand-crimson-500/10 px-3 py-2 text-xs text-brand-crimson-600"
              >
                {error}
              </motion.p>
            )}

            <Button type="submit" variant="brand" className="w-full" size="lg">
              Sign in
            </Button>
          </form>

          <div className="mt-8">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-ink-100" />
              <span className="text-xs text-ink-400">Quick demo access</span>
              <div className="h-px flex-1 bg-ink-100" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {demoAccounts.map((acc) => {
                const user = mockUsers.find((u) => u.id === acc.id)!;
                return (
                  <button
                    key={acc.id}
                    onClick={() => loginAsDemo(acc.id)}
                    className="flex flex-col items-center gap-1.5 rounded-lg border border-ink-100 bg-white px-2 py-3 text-center transition-colors hover:border-brand-blue-300 hover:bg-brand-blue-50/50"
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold text-white ${user.avatarColor}`}
                    >
                      {initials(user.name)}
                    </span>
                    <span className="text-xs font-medium text-ink-800">{acc.label}</span>
                    <span className="text-[10px] text-ink-400">{acc.desc}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-center text-[11px] text-ink-400">
              Demo credentials — admin@gmiccares.ph / admin123, tech@gmiccares.ph /
              tech123
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
