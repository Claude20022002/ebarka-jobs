import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import config from '@/config';

export const metadata: Metadata = {
  title: `Erreur de connexion | ${config.title}`,
  description: 'Une erreur est survenue pendant la connexion.',
};

type AuthErrorPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error?: string): string {
  switch (error) {
    case 'AccessDenied':
      return "Vous n'avez pas l'autorisation d'acceder a cette ressource.";
    case 'Verification':
      return 'Le lien de connexion est invalide ou a expire.';
    case 'OAuthSignin':
    case 'OAuthCallback':
      return 'La connexion avec le fournisseur externe a echoue.';
    case 'EmailSignin':
      return "L'envoi du lien magique a echoue.";
    default:
      return 'La connexion a echoue. Veuillez reessayer.';
  }
}

export default async function AuthErrorPage({
  searchParams,
}: AuthErrorPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <main className="container flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Connexion impossible</CardTitle>
          <CardDescription>
            {getErrorMessage(resolvedSearchParams.error)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Si le probleme persiste, contactez le support depuis la page de
            contact.
          </p>
        </CardContent>
        <CardFooter className="gap-3">
          <Button asChild type="button">
            <Link href="/auth/login">Reessayer</Link>
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href="/">Retour accueil</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
