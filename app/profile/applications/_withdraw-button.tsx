'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { withdrawApplication } from '../_actions';

type WithdrawButtonProps = {
  applicationId: string;
};

export function WithdrawButton({ applicationId }: WithdrawButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleWithdraw = () => {
    setError(null);
    startTransition(async () => {
      try {
        await withdrawApplication(applicationId);
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
        onClick={handleWithdraw}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleWithdraw();
          }
        }}
        size="sm"
        type="button"
        variant="ghost"
      >
        {isPending ? 'Retrait…' : 'Retirer'}
      </Button>
      {error && (
        <span className="text-destructive text-xs" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
