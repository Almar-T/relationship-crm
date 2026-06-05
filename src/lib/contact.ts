/** Build tappable links for the Message / Email quick actions. */

/** `sms:` link. On iPhone this opens Messages (iMessage when available). */
export function smsHref(phone: string): string {
  return `sms:${cleanPhone(phone)}`;
}

/** `mailto:` link for the default mail app. */
export function mailtoHref(email: string): string {
  return `mailto:${email.trim()}`;
}

/** Keep only digits and a leading `+` so the OS dialer/Messages parses it. */
function cleanPhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}
