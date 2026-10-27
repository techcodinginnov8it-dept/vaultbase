import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-muted/30 p-6 md:p-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
