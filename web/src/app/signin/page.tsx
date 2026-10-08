"use client";
// The sign-in door. The form itself lives in one place (components/sign-in-form),
// because /free uses the same one and the rule about codes must not be written twice.
import { Suspense } from "react";
import { Shell } from "@/components/Shell";
import { SignInForm } from "@/components/sign-in-form";

export default function SignIn() {
  return (
    <Shell>
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 sm:p-8">
        <h1 className="mb-4 text-2xl font-bold text-pine">Sign in</h1>
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>
    </Shell>
  );
}
