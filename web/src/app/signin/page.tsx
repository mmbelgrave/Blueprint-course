"use client";
// The sign-in door. The form itself lives in one place (components/sign-in-form),
// because /free uses the same one and the rule about codes must not be written twice.
import Link from "next/link";
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
        {/*
            Here on purpose (legal review, part 2, point 3). Somebody who
            cannot get in is exactly the person who may want their money back,
            and this is the page they are standing on.
         */}
        <p className="mt-6 border-t border-line pt-4 text-sm text-stone">
          Bought the course and want to withdraw from the contract?{" "}
          <Link href="/withdraw" className="text-pine underline">
            Withdraw from contract here
          </Link>
          . You do not need to sign in.
        </p>
      </div>
    </Shell>
  );
}
