const PREFIX = 'CATARINOTLON - ';

/**
 * Longest concept accepted by bank transfer forms.
 *
 * @remarks
 * Banco de México's Circular 3/2012 guarantees up to 40 characters of payment
 * concept on transfers made from mobile devices. Using it for every transfer keeps
 * the concept whole in banking apps. The general SPEI field may allow more.
 */
const MAX_CONCEPT_LENGTH = 40;

/**
 * Builds the concept a runner must write on their bank transfer.
 *
 * @remarks
 * The result is uppercase plain ASCII because bank concept fields reject
 * special characters. This is the one place the event name has no accent.
 *
 * @param accountHolderName - The account holder's full name.
 * @returns The concept, at most 40 characters long.
 *
 * @example
 * ```ts
 * buildPaymentConcept('Sofía Ramírez'); // 'CATARINOTLON - SOFIA RAMIREZ'
 * ```
 */
export function buildPaymentConcept(accountHolderName: string): string {
  const name = accountHolderName
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

  return `${PREFIX}${name}`.slice(0, MAX_CONCEPT_LENGTH).trimEnd();
}
