import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/modules/auth/components/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <LoginForm />
    </Suspense>
  );
}
