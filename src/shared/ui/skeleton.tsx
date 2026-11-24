import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { cn } from './cn';

/**
 * A placeholder block in the shape of content that is still loading.
 *
 * @remarks
 * It shimmers, and stays still when the system asks for less motion. It is
 * hidden from assistive technology; {@link LoadingRegion} announces the wait.
 *
 * @param props - Classes for its size and shape.
 * @returns The block.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        'animate-shimmer rounded-lg skeleton-shimmer motion-reduce:animate-none',
        className,
      )}
    />
  );
}

/**
 * Announces that a page is loading and holds its skeleton.
 *
 * @param props - The skeleton layout.
 * @returns The busy region.
 */
export function LoadingRegion({ children }: { children: ReactNode }) {
  const t = useTranslations('common');
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t('loading')}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

function CardShape({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-4 rounded-2xl bg-background p-5 md:p-7', className)}>
      {children}
    </div>
  );
}

function Field() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}

/**
 * The shape of a form page: sign-up, sign-in, registration, or passwords.
 *
 * @returns The skeleton.
 */
export function FormPageSkeleton() {
  return (
    <LoadingRegion>
      <CardShape className="mx-auto w-full max-w-[540px]">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Field />
        <Field />
        <Field />
        <Skeleton className="h-13 w-full rounded-full" />
      </CardShape>
    </LoadingRegion>
  );
}

/**
 * The shape of My account: the runner picker and the selected runner's panel.
 *
 * @returns The skeleton.
 */
export function AccountSkeleton() {
  return (
    <LoadingRegion>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl opacity-60" />
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <CardShape>
            <Skeleton className="h-6 w-40" />
            <div className="flex gap-4">
              <Skeleton className="size-32 shrink-0 rounded-xl" />
              <div className="flex flex-1 flex-col gap-3">
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
            <Skeleton className="h-11 w-48 rounded-full" />
          </CardShape>
          <CardShape>
            <Skeleton className="aspect-[614/900] w-full rounded-xl" />
            <Field />
          </CardShape>
        </div>
      </div>
    </LoadingRegion>
  );
}

/**
 * The shape of the payment page: the runners to pay and the transfer details.
 *
 * @returns The skeleton.
 */
export function PaymentSkeleton() {
  return (
    <LoadingRegion>
      <div className="mx-auto flex w-full max-w-[540px] flex-col gap-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-3/4" />
        <CardShape>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardShape>
        <CardShape>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </CardShape>
      </div>
    </LoadingRegion>
  );
}

/**
 * The shape of the admin list: totals, filters, and table rows.
 *
 * @returns The skeleton.
 */
export function AdminListSkeleton() {
  return (
    <LoadingRegion>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
        <CardShape className="gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </CardShape>
      </div>
    </LoadingRegion>
  );
}

/**
 * The shape of an admin detail page: a payment review or a registration form.
 *
 * @returns The skeleton.
 */
export function AdminDetailSkeleton() {
  return (
    <LoadingRegion>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <CardShape>
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          </CardShape>
          <CardShape>
            <Field />
            <Field />
            <Field />
            <Skeleton className="h-13 w-full rounded-full" />
          </CardShape>
        </div>
      </div>
    </LoadingRegion>
  );
}

/**
 * The shape of kit pickup on a phone: the search and the runner's kit.
 *
 * @returns The skeleton.
 */
export function KitPickupSkeleton() {
  return (
    <LoadingRegion>
      <div className="mx-auto flex w-full max-w-[540px] flex-col gap-4">
        <Skeleton className="h-13 w-full rounded-full" />
        <Field />
        <CardShape>
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-13 w-full rounded-full" />
        </CardShape>
      </div>
    </LoadingRegion>
  );
}
