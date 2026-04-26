"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp
      path="/sign-up"
      routing="path"
      signInUrl="/sign-in"
      fallbackRedirectUrl="/setup"
      appearance={{
        elements: {
          formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white font-semibold",
          footerAction__signIn: "text-blue-600 dark:text-blue-400",
          headerTitle: "text-xl font-bold",
          headerSubtitle: "text-sm text-muted-foreground",
        },
      }}
    />
  );
}
