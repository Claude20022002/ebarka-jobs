import { Mail } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import config from '@/config';
import { getEnabledAuthProviders } from '@/lib/auth/config';
import { signIn } from '@/lib/auth/utils';

export const metadata: Metadata = {
  title: `Connexion | ${config.title}`,
  description: 'Connectez-vous a votre compte E-Barka Jobs.',
};

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
  }>;
};

function getSafeCallbackUrl(callbackUrl?: string): string {
  if (!callbackUrl?.startsWith('/')) {
    return '/dashboard';
  }

  return callbackUrl;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const callbackUrl = getSafeCallbackUrl(resolvedSearchParams.callbackUrl);
  const providers = getEnabledAuthProviders();

  async function signInWithGoogle() {
    'use server';

    await signIn('google', { redirectTo: callbackUrl });
  }

  async function signInWithEmail(formData: FormData) {
    'use server';

    const email = formData.get('email');
    if (typeof email !== 'string') {
      return;
    }

    await signIn('resend', {
      email,
      redirectTo: callbackUrl,
    });
  }

  return (
    <main className="container flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <CardDescription>
            Accedez a votre espace candidat ou employeur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {providers.google && (
            <form action={signInWithGoogle}>
              <Button className="w-full" type="submit" variant="outline">
                Continuer avec Google
              </Button>
            </form>
          )}

          {providers.email && (
            <form action={signInWithEmail} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  autoComplete="email"
                  id="email"
                  name="email"
                  placeholder="vous@exemple.com"
                  required
                  type="email"
                />
              </div>
              <Button className="w-full gap-2" type="submit">
                <Mail aria-hidden="true" className="h-4 w-4" />
                Recevoir un lien magique
              </Button>
            </form>
          )}

          {!(providers.google || providers.email) && (
            <p className="rounded-md border bg-muted p-3 text-muted-foreground text-sm">
              Aucun fournisseur de connexion n'est configure pour le moment.
            </p>
          )}

          <p className="text-center text-muted-foreground text-sm">
            En continuant, vous acceptez les{' '}
            <Link className="underline underline-offset-4" href="/terms">
              conditions d'utilisation
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
