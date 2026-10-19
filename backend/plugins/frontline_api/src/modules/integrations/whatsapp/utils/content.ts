import { escapeHtml } from '@/integrations/mail/utils/html';
import { WhatsappWebhookMessage } from '@/integrations/whatsapp/utils/payload';

export type WhatsappMediaKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'sticker';

export interface IWhatsappMediaRef {
  kind: WhatsappMediaKind;
  id: string;
  mimeType?: string;
  fileName?: string;
}

export interface IWhatsappInboundContent {
  text: string;
  media?: IWhatsappMediaRef;
}

const MEDIA_KINDS: WhatsappMediaKind[] = [
  'image',
  'video',
  'audio',
  'document',
  'sticker',
];

const isMediaKind = (type: string): type is WhatsappMediaKind =>
  MEDIA_KINDS.includes(type as WhatsappMediaKind);

const describeLocation = (
  location: NonNullable<WhatsappWebhookMessage['location']>,
) => {
  const label = [location.name, location.address].filter(Boolean).join(', ');
  const link = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;

  return label ? `📍 ${label}\n${link}` : `📍 ${link}`;
};

const describeContacts = (
  contacts: NonNullable<WhatsappWebhookMessage['contacts']>,
) =>
  contacts
    .map((contact) =>
      [
        contact.name?.formatted_name,
        ...(contact.phones || []).map(({ phone }) => phone),
      ]
        .filter(Boolean)
        .join(' '),
    )
    .filter(Boolean)
    .map((line) => `👤 ${line}`)
    .join('\n');

/**
 * Maps a webhook message to inbox text and an optional media reference.
 * Returns null for events that are not conversation messages (reactions).
 */
export const describeWhatsappMessage = (
  message: WhatsappWebhookMessage,
): IWhatsappInboundContent | null => {
  const { type } = message;

  if (type === 'reaction') return null;

  if (type === 'text' && message.text) {
    return { text: message.text.body };
  }

  if (isMediaKind(type)) {
    const media = message[type];

    if (media) {
      return {
        text: media.caption || '',
        media: {
          kind: type,
          id: media.id,
          mimeType: media.mime_type,
          fileName: media.filename,
        },
      };
    }
  }

  if (type === 'location' && message.location) {
    return { text: describeLocation(message.location) };
  }

  if (type === 'interactive' && message.interactive) {
    const reply =
      message.interactive.button_reply || message.interactive.list_reply;

    if (reply) return { text: reply.title };
  }

  if (type === 'button' && message.button) {
    return { text: message.button.text };
  }

  if (type === 'contacts' && message.contacts?.length) {
    return { text: describeContacts(message.contacts) };
  }

  return {
    text: `This WhatsApp message type (${type}) can't be shown in erxes. Open WhatsApp to view it.`,
  };
};

export const whatsappTextToHtml = (text: string): string =>
  escapeHtml(text).replace(/\n/g, '<br>');

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

const decodeEntities = (text: string) =>
  text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === '#') {
      const value =
        code[1] === 'x' || code[1] === 'X'
          ? Number.parseInt(code.slice(2), 16)
          : Number.parseInt(code.slice(1), 10);

      return Number.isFinite(value) ? String.fromCodePoint(value) : entity;
    }

    return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
  });

/** Converts composer HTML to WhatsApp text, keeping bold, italic and strike formatting. */
export const htmlToWhatsappText = (html: string): string =>
  decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/(p|div|li|blockquote|h[1-6])>/gi, '\n')
      .replace(/<\/?(strong|b)(\s[^>]*)?>/gi, '*')
      .replace(/<\/?(em|i)(\s[^>]*)?>/gi, '_')
      .replace(/<\/?(s|del|strike)(\s[^>]*)?>/gi, '~')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** Splits text into WhatsApp-sized parts, preferring line then word boundaries. */
export const splitWhatsappText = (text: string, limit: number): string[] => {
  const parts: string[] = [];
  let rest = text.trim();

  while (rest.length > limit) {
    const window = rest.slice(0, limit);
    const breakAt = Math.max(
      window.lastIndexOf('\n'),
      window.lastIndexOf(' '),
    );
    const cut = breakAt > limit / 2 ? breakAt : limit;

    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }

  if (rest) parts.push(rest);

  return parts;
};

/** WhatsApp accepts only some formats per media type; everything else goes as a document. */
export const getOutgoingMediaType = (
  mimeType: string,
): 'image' | 'video' | 'audio' | 'document' => {
  const type = mimeType.toLowerCase();

  if (type === 'image' || /^image\/(jpeg|png)$/.test(type)) return 'image';
  if (/^video\/(mp4|3gpp)$/.test(type)) return 'video';
  if (/^audio\/(aac|amr|mpeg|mp4|ogg)$/.test(type)) return 'audio';

  return 'document';
};
