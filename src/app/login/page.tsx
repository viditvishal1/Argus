import { Suspense } from "react";
import { LoginForm } from "@/app/login/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-12 text-sm text-ink-dim">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
