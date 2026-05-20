import { redirect } from 'next/navigation';

type OffresPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function createHomeHref(
  searchParams: Record<string, string | string[] | undefined>
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    }
  }

  const query = params.toString();
  return query ? `/?${query}` : '/';
}

export default async function OffresPage({ searchParams }: OffresPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  redirect(createHomeHref(resolvedSearchParams));
}
