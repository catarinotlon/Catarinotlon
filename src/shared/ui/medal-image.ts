/** Identifies one of the eight medals. */
export type MedalIdentity = {
  /** The race distance on the medal. */
  distance: '3K' | '5K';
} & ({ kind: 'finisher'; place?: never } | { kind: 'podium'; place: 1 | 2 | 3 });

/**
 * Finds the image of a medal.
 *
 * @param medal - The medal's kind, distance, and place.
 * @returns Its path in the public folder.
 *
 * @example
 * ```ts
 * medalImagePath({ kind: 'podium', distance: '5K', place: 2 });
 * // '/images/medals/podium-5k-2.webp'
 * ```
 */
export function medalImagePath(medal: MedalIdentity): string {
  const distance = medal.distance.toLowerCase();
  const name =
    medal.kind === 'finisher' ? `finisher-${distance}` : `podium-${distance}-${medal.place}`;
  return `/images/medals/${name}.webp`;
}
