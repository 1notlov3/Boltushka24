"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e3e5e8] to-white dark:from-[#1E1F22] dark:to-[#313338] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl bg-white/80 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-2xl rounded-3xl overflow-hidden flex flex-col lg:flex-row">
        <div className="flex-1 p-8 lg:p-12 flex flex-col justify-between gap-6 bg-gradient-to-br from-emerald-500 via-blue-500 to-indigo-600 text-white">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] font-semibold text-white/80">Болтушка 24</p>
            <h1 className="text-3xl lg:text-4xl font-extrabold leading-tight">
              Создайте аккаунт за минуту
            </h1>
            <p className="text-white/85 text-base lg:text-lg leading-relaxed">
              Присоединяйтесь к команде: текстовые каналы, звонки и быстрые реакции в одном месте.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-white/90">
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3">
              ✅ Безопасная регистрация
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3">
              💬 Чат и голос сразу
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3">
              🎨 Светлая / тёмная тема
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3">
              🌍 Работает на всех платформах
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 lg:p-10 flex items-center justify-center bg-white dark:bg-[#1b1c1f]">
          <div className="w-full max-w-md">
            <SignUp
              path="/sign-up"
              routing="path"
              signInUrl="/sign-in"
              fallbackRedirectUrl="/setup"
              appearance={{
                elements: {
                  formButtonPrimary:
                    "bg-blue-600 hover:bg-blue-700 text-white font-semibold",
                  footerAction__signIn: "text-blue-600 dark:text-blue-400",
                  card: "shadow-none bg-transparent",
                  headerTitle: "text-xl font-bold",
                  headerSubtitle: "text-sm text-muted-foreground",
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
