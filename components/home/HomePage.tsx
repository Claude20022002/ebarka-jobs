'use client';

import { formatDistanceToNow, isToday } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo } from 'react';
import { JobCard } from '@/components/jobs/JobCard';
import { HeroSection } from '@/components/ui/hero-section';
import { JobFilters } from '@/components/ui/job-filters';
import { JobSearchInput } from '@/components/ui/job-search-input';
import { JobsPerPageSelect } from '@/components/ui/jobs-per-page-select';
import { PaginationControl } from '@/components/ui/pagination-control';
import { PostJobBanner } from '@/components/ui/post-job-banner';
import { SortOrderSelect } from '@/components/ui/sort-order-select';
import config from '@/config';
import type { LanguageCode } from '@/lib/constants/languages';
import type { CareerLevel, Job } from '@/lib/db/airtable';
import { usePagination } from '@/lib/hooks/usePagination';

type FilterType =
  | 'type'
  | 'role'
  | 'remote'
  | 'salary'
  | 'visa'
  | 'language'
  | 'clear';
type FilterValue = string[] | boolean | CareerLevel[] | LanguageCode[] | true;

type HomePageContentProps = {
  initialJobs: Job[];
  filterJobs: Job[];
  totalJobs: number;
  totalFilteredJobs: number;
  jobsAddedToday: number;
  page: number;
  perPage: number;
};

function HomePageContent({
  initialJobs,
  filterJobs,
  totalJobs,
  totalFilteredJobs,
  jobsAddedToday,
  page,
  perPage,
}: HomePageContentProps) {
  const searchParams = useSearchParams();
  const { setPage } = usePagination();

  // Parse initial filters from URL
  const initialFilters = {
    types: searchParams.get('types')?.split(',').filter(Boolean) || [],
    roles: (searchParams.get('roles')?.split(',').filter(Boolean) ||
      []) as CareerLevel[],
    remote: searchParams.get('remote') === 'true',
    salaryRanges: searchParams.get('salary')?.split(',').filter(Boolean) || [],
    visa: searchParams.get('visa') === 'true',
    languages: (searchParams.get('languages')?.split(',').filter(Boolean) ||
      []) as LanguageCode[],
  };

  const handleFilterChange = useCallback(
    (_filterType: FilterType, _value: FilterValue) => {
      setPage(null);
    },
    [setPage]
  );

  // Get the most recent job's posted date (timestamp or null)
  const lastUpdatedTimestamp = useMemo(() => {
    if (filterJobs.length === 0) {
      return null;
    }

    const mostRecentDate = Math.max(
      ...filterJobs.map((job) => new Date(job.posted_date).getTime())
    );

    return mostRecentDate; // Return the timestamp
  }, [filterJobs]);

  // Calculate jobs added today
  const fallbackJobsAddedToday = useMemo(
    () => filterJobs.filter((job) => isToday(new Date(job.posted_date))).length,
    [filterJobs]
  );
  const displayedJobsAddedToday = jobsAddedToday || fallbackJobsAddedToday;

  return (
    <main className="min-h-screen bg-background">
      <HeroSection
        badge={config.badge}
        description={config.description}
        title={config.title}
        // Will use the global config.ui.heroImage since we're not specifying a custom one
      >
        {/* Search Bar - Replace with our new component */}
        <div className="max-w-[480px]">
          <JobSearchInput />
        </div>

        {/* Quick Stats - Reverted to original structure with color customization */}
        {(config.quickStats?.enabled ?? true) && (
          <div
            className="mt-6 grid max-w-[480px] grid-cols-3 gap-4 text-muted-foreground text-xs"
            // Apply base color here, specific elements might override
            style={{ color: config.ui.heroStatsColor || undefined }}
          >
            {/* Open Jobs */}
            {(config.quickStats?.sections?.openJobs?.enabled ?? true) && (
              <div>
                <div
                  className="font-medium text-foreground"
                  // Override title color if heroStatsColor is set
                  style={{
                    color:
                      config.ui.heroStatsColor ||
                      undefined /* Default: text-foreground */,
                  }}
                >
                  {config.quickStats?.sections?.openJobs?.title || 'Open Jobs'}
                </div>
                <div className="flex items-center">
                  {(config.quickStats?.sections?.openJobs
                    ?.showNewJobsIndicator ??
                    true) &&
                    displayedJobsAddedToday > 0 && (
                      <span className="pulse-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                    )}
                  <span /* Value inherits color from parent div */>
                    {totalJobs.toLocaleString()}
                  </span>
                  {(config.quickStats?.sections?.openJobs
                    ?.showNewJobsIndicator ??
                    true) &&
                    displayedJobsAddedToday > 0 && (
                      <span
                        className="ml-1"
                        /* Added today text inherits color */
                      >
                        ({displayedJobsAddedToday.toLocaleString()} added today)
                      </span>
                    )}
                </div>
              </div>
            )}

            {/* Last Updated */}
            {(config.quickStats?.sections?.lastUpdated?.enabled ?? true) &&
              lastUpdatedTimestamp && ( // Ensure timestamp exists
                <div>
                  <div
                    className="font-medium text-foreground"
                    style={{
                      color:
                        config.ui.heroStatsColor ||
                        undefined /* Default: text-foreground */,
                    }}
                  >
                    {config.quickStats?.sections?.lastUpdated?.title ||
                      'Last Updated'}
                  </div>
                  <div /* Value inherits color */>
                    {formatDistanceToNow(new Date(lastUpdatedTimestamp), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              )}

            {/* Trending Companies */}
            {(config.quickStats?.sections?.trending?.enabled ?? true) && (
              <div>
                <div
                  className="font-medium text-foreground"
                  style={{
                    color:
                      config.ui.heroStatsColor ||
                      undefined /* Default: text-foreground */,
                  }}
                >
                  {config.quickStats?.sections?.trending?.title || 'Trending'}
                </div>
                <div /* Value inherits color */>
                  {Array.from(new Set(filterJobs.map((job) => job.company)))
                    .slice(
                      0,
                      config.quickStats?.sections?.trending?.maxCompanies || 3
                    )
                    .join(', ')}
                </div>
              </div>
            )}
          </div>
        )}
      </HeroSection>

      {/* Jobs Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="order-2 flex-[3] md:order-1">
            <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end sm:gap-0">
              <div className="w-full space-y-1 sm:w-auto">
                <h2 className="flex flex-wrap items-center gap-2 font-semibold text-xl tracking-tight">
                  Latest Opportunities
                  {page > 1 && (
                    <span className="font-normal text-gray-500">
                      Page {page}
                    </span>
                  )}
                </h2>
                <p className="text-muted-foreground text-sm">
                  Showing {initialJobs.length.toLocaleString()} of{' '}
                  {totalFilteredJobs.toLocaleString()} positions
                </p>
              </div>
              <div className="flex w-full items-center justify-between gap-3 overflow-x-auto pb-1 sm:w-auto sm:justify-end">
                <JobsPerPageSelect />
                <SortOrderSelect />
              </div>
            </div>

            <div className="space-y-4">
              {initialJobs.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    No positions found matching your search criteria. Try
                    adjusting your search terms.
                  </p>
                </div>
              ) : (
                initialJobs.map((job) => <JobCard job={job} key={job.id} />)
              )}
            </div>

            {/* Pagination with optimized range */}
            {totalFilteredJobs > perPage && (
              <PaginationControl
                itemsPerPage={perPage}
                totalItems={totalFilteredJobs}
              />
            )}

            {/* Post Job Banner - Mobile only */}
            <div className="mt-8 md:hidden">
              <PostJobBanner />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="order-1 w-full md:order-2 md:w-[240px] lg:w-[250px] xl:w-[260px]">
            <div className="space-y-6">
              <JobFilters
                initialFilters={initialFilters}
                jobs={filterJobs}
                onFilterChange={handleFilterChange}
              />
              {/* Post Job Banner - Desktop only */}
              <div className="hidden md:block">
                <PostJobBanner />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export type HomePageProps = HomePageContentProps;

export function HomePage(props: HomePageProps) {
  return (
    <Suspense>
      <HomePageContent {...props} />
    </Suspense>
  );
}
