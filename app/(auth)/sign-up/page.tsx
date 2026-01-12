"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-gray-100 dark:bg-gray-900 py-10">
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        redirectUrl="/setup"
        appearance={{ elements: { formButtonPrimary: "bg-blue-600 hover:bg-blue-700" } }}
      />
    </div>
  );
}
