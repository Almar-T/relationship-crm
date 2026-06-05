/**
 * Minimal vCard (.vcf) parser — enough to pre-fill a new contact from a card
 * exported by Apple Contacts, Google Contacts, etc. We only pull the fields the
 * app actually stores (name, company, role, phone, email) and ignore the rest.
 *
 * Handles vCard 3.0/4.0 essentials: line folding, property groups
 * (`item1.TEL`), TYPE parameters, and value escaping. If a file holds multiple
 * cards we take the first.
 */

export interface ParsedCard {
  name?: string;
  company?: string;
  role?: string;
  phone?: string;
  email?: string;
}

export function parseVCard(text: string): ParsedCard {
  const lines = unfold(firstCard(text));
  const card: ParsedCard = {};
  const tels: { value: string; cell: boolean }[] = [];
  let nameFromN: string | undefined;

  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const rawValue = line.slice(colon + 1).trim();
    if (!rawValue) continue;

    const segments = line.slice(0, colon).split(';');
    const prop = stripGroup(segments[0]).toUpperCase();
    const params = segments.slice(1).join(';').toUpperCase();

    switch (prop) {
      case 'FN':
        card.name = unescapeValue(rawValue);
        break;
      case 'N':
        if (!nameFromN) nameFromN = formatStructuredName(rawValue);
        break;
      case 'ORG':
        if (!card.company) card.company = unescapeValue(rawValue.split(';')[0]).trim();
        break;
      case 'TITLE':
        if (!card.role) card.role = unescapeValue(rawValue);
        break;
      case 'TEL':
        tels.push({ value: unescapeValue(rawValue), cell: /CELL|MOBILE|IPHONE/.test(params) });
        break;
      case 'EMAIL':
        if (!card.email) card.email = unescapeValue(rawValue);
        break;
    }
  }

  if (!card.name && nameFromN) card.name = nameFromN;
  const tel = tels.find((t) => t.cell) ?? tels[0];
  if (tel) card.phone = tel.value;

  return card;
}

/** Take the content of the first BEGIN:VCARD … END:VCARD block, or the whole text. */
function firstCard(text: string): string {
  const begin = text.search(/BEGIN:VCARD/i);
  if (begin === -1) return text;
  const endMatch = text.slice(begin).match(/END:VCARD/i);
  const end = endMatch ? begin + endMatch.index! : text.length;
  return text.slice(begin, end);
}

/** Join continuation lines (those starting with a space or tab) onto the prior line. */
function unfold(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split(/\r\n|\r|\n/)) {
    if (out.length && (line.startsWith(' ') || line.startsWith('\t'))) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** `item1.TEL` → `TEL`. */
function stripGroup(name: string): string {
  const dot = name.indexOf('.');
  return dot === -1 ? name : name.slice(dot + 1);
}

/** N is `Family;Given;Additional;Prefix;Suffix` → "Prefix Given Additional Family Suffix". */
function formatStructuredName(value: string): string {
  const [family = '', given = '', additional = '', prefix = '', suffix = ''] = value
    .split(';')
    .map((part) => unescapeValue(part).trim());
  return [prefix, given, additional, family, suffix].filter(Boolean).join(' ');
}

function unescapeValue(value: string): string {
  return value.replace(/\\([,;\\nN])/g, (_, ch) => (ch === 'n' || ch === 'N' ? '\n' : ch));
}
