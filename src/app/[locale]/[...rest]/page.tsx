import { notFound } from 'next/navigation';

/** Sends unknown paths to the localized 404 page. */
export default function CatchAllPage() {
  notFound();
}
