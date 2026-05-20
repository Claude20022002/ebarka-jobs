import type { Metadata } from 'next';
import { HomePage } from '@/components/home/home-page';
import config from '@/config';
import { getJobStats, getJobs, type JobFilters } from '@/lib/db/queries/jobs';
import { generateMetadata } from '@/lib/utils/metadata';

// Add metadata for SEO
export const metadata: Metadata = generateMetadata({
  title: config.title,
  description: config.description,
  path: '/',
  openGraph: {
    type: 'website',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: `${config.title} - ${config.description}`,
      },
    ],
  },
});

// Revalidate every 5 minutes
export const revalidate = 300;

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
): string | string[] | null {
  return searchParams[key] ?? null;
}

function getSingleSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
): string | null {
  const value = searchParams[key];
  if (Array.isArray(value)) {
    return value.at(0) ?? null;
  }

  return value ?? null;
}

function buildJobFilters(
  searchParams: Record<string, string | string[] | undefined>
): JobFilters {
  return {
    q: getSingleSearchParam(searchParams, 'q'),
    type: getSearchParam(searchParams, 'types'),
    level: getSearchParam(searchParams, 'roles'),
    remote: getSingleSearchParam(searchParams, 'remote'),
    salary: getSearchParam(searchParams, 'salary'),
    visa: getSingleSearchParam(searchParams, 'visa'),
    language: getSearchParam(searchParams, 'languages'),
    page: getSingleSearchParam(searchParams, 'page'),
    perPage: getSingleSearchParam(searchParams, 'per_page'),
    sort: getSingleSearchParam(searchParams, 'sort'),
  };
}

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = buildJobFilters(resolvedSearchParams);
  const [jobsResult, filterOptionsResult, stats] = await Promise.all([
    getJobs(filters),
    getJobs({ perPage: 100 }),
    getJobStats(),
  ]);

  return (
    <HomePage
      filterJobs={filterOptionsResult.jobs}
      initialJobs={jobsResult.jobs}
      jobsAddedToday={stats.addedToday}
      page={jobsResult.page}
      perPage={jobsResult.perPage}
      totalFilteredJobs={jobsResult.total}
      totalJobs={stats.active}
    />
  );
}
