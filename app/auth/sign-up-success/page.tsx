import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, Mail } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-muted/30 p-6 md:p-10">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <Card className="overflow-hidden shadow-xl shadow-black/10">
          <div className="flex justify-center bg-primary px-6 py-8 text-primary-foreground">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/15">
              <Mail className="h-8 w-8" />
            </div>
          </div>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex items-center justify-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Account created
            </div>
            <CardTitle className="text-2xl">Confirm your email</CardTitle>
            <CardDescription>One quick step before you enter Vaultbase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-center text-sm leading-6 text-muted-foreground">
              We sent a confirmation link to your email. Open Gmail, click the link, and your account will be ready to use.
            </p>
            <Button asChild className="w-full" size="lg">
              <a href="https://mail.google.com" target="_blank" rel="noreferrer">
                Open Gmail <ExternalLink />
              </a>
            </Button>
            <div className="rounded-lg border bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">
              <strong className="text-foreground">Can&apos;t find it?</strong> Check your spam or promotions folder. The email may take a minute to arrive.
            </div>
            <p className="text-center text-sm">
              <Link href="/auth/login" className="font-medium underline underline-offset-4">Back to sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
