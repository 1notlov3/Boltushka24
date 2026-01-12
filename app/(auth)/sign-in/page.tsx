"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e3e5e8] to-white dark:from-[#1E1F22] dark:to-[#313338] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl bg-white/80 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-2xl rounded-3xl overflow-hidden flex flex-col lg:flex-row">
        <div className="flex-1 p-8 lg:p-12 flex flex-col justify-between gap-6 bg-gradient-to-br from-blue-600 via-blue-500 to-emerald-500 text-white">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] font-semibold text-white/80">Болтушка 24</p>
            <h1 className="text-3xl lg:text-4xl font-extrabold leading-tight">
              Вход в пространство общения
            </h1>
            <p className="text-white/85 text-base lg:text-lg leading-relaxed">
              Подключайтесь к серверам, общайтесь в каналах и звонках. Всё под рукой, на любых устройствах.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-white/90">
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3">
              🚀 Мгновенный старт
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3">
              🔒 Защищённый доступ
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3">
              📱 Удобно на мобайле
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3">
              🌙 Светлая и тёмная темы
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 lg:p-10 flex items-center justify-center bg-white dark:bg-[#1b1c1f]">
          <div className="w-full max-w-md">
            <SignIn
              path="/sign-in"
              routing="path"
              signUpUrl="/sign-up"
              fallbackRedirectUrl="/setup"
              appearance={{
                elements: {
                  formButtonPrimary:
                    "bg-blue-600 hover:bg-blue-700 text-white font-semibold",
                  footerAction__signUp: "text-blue-600 dark:text-blue-400",
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
