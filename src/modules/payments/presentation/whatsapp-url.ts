/**
 * Builds the link that opens a WhatsApp chat.
 *
 * @param number - The phone number, in any format.
 * @returns The `wa.me` link.
 */
export function whatsappUrl(number: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}`;
}
