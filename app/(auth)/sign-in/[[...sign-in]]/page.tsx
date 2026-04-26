"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn
      path="/sign-in"
      routing="path"
      signUpUrl="/sign-up"
      fallbackRedirectUrl="/setup"
      appearance={{
        elements: {
          formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white font-semibold",
          footerAction__signUp: "text-blue-600 dark:text-blue-400",
          headerTitle: "text-xl font-bold",
          headerSubtitle: "text-sm text-muted-foreground",
        },
      }}
    />
  );
}
