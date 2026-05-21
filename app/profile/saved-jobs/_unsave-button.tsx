'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { unsaveJob } from '../_actions';

type UnsaveButtonProps = {
  savedJobId: string;
};

export function UnsaveButton({ savedJobId }: UnsaveButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleUnsave = () => {
    setError(null);
    startTransition(async () => {
      try {
        await unsaveJob(savedJobId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Une erreur est survenue.'
        );
      }
    });
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        aria-disabled={isPending}
        disabled={isPending}
        onClick={handleUnsave}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleUnsave();
          }
        }}
        size="sm"
        type="button"
        variant="ghost"
      >
        {isPending ? 'Suppression…' : 'Retirer'}
      </Button>
      {error && (
        <span className="text-destructive text-xs" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
