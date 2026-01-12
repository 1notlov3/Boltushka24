"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-gray-100 dark:bg-gray-900 py-10">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        redirectUrl="/setup"
        appearance={{ elements: { formButtonPrimary: "bg-blue-600 hover:bg-blue-700" } }}
      />
    </div>
  );
}
