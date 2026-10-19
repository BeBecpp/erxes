import {
  describeWhatsappMessage,
  getOutgoingMediaType,
  htmlToWhatsappText,
  splitWhatsappText,
  whatsappTextToHtml,
} from '../utils/content';

describe('describeWhatsappMessage', () => {
  it('maps text, media, location and replies to inbox text', () => {
    expect(
      describeWhatsappMessage({ id: 'w1', type: 'text', text: { body: 'Hi' } }),
    ).toEqual({ text: 'Hi' });

    expect(
      describeWhatsappMessage({
        id: 'w2',
        type: 'document',
        document: {
          id: 'media-1',
          mime_type: 'application/pdf',
          filename: 'invoice.pdf',
          caption: 'Invoice',
        },
      }),
    ).toEqual({
      text: 'Invoice',
      media: {
        kind: 'document',
        id: 'media-1',
        mimeType: 'application/pdf',
        fileName: 'invoice.pdf',
      },
    });

    expect(
      describeWhatsappMessage({
        id: 'w3',
        type: 'location',
        location: { latitude: 47.9, longitude: 106.9, name: 'Office' },
      })?.text,
    ).toBe('📍 Office\nhttps://maps.google.com/?q=47.9,106.9');

    expect(
      describeWhatsappMessage({
        id: 'w4',
        type: 'interactive',
        interactive: { type: 'button_reply', button_reply: { title: 'Yes' } },
      }),
    ).toEqual({ text: 'Yes' });
  });

  it('skips reactions and labels unsupported types', () => {
    expect(describeWhatsappMessage({ id: 'w5', type: 'reaction' })).toBeNull();
    expect(
      describeWhatsappMessage({ id: 'w6', type: 'order' })?.text,
    ).toContain('(order)');
  });
});

describe('HTML conversion', () => {
  it('escapes inbound text and keeps line breaks', () => {
    expect(whatsappTextToHtml('a < b\nc')).toBe('a &lt; b<br>c');
  });

  it('converts composer HTML to WhatsApp formatting', () => {
    expect(
      htmlToWhatsappText(
        '<p>Hello <strong>there</strong> &amp; <em>welcome</em></p><p>a &lt; b</p><ul><li>one</li></ul>',
      ),
    ).toBe('Hello *there* & _welcome_\na < b\n• one');
  });
});

describe('splitWhatsappText', () => {
  it('keeps short text whole and splits long text on word boundaries', () => {
    expect(splitWhatsappText('short', 10)).toEqual(['short']);
    expect(splitWhatsappText('aaaa bbbb cccc', 10)).toEqual([
      'aaaa bbbb',
      'cccc',
    ]);
    expect(splitWhatsappText('x'.repeat(25), 10)).toEqual([
      'x'.repeat(10),
      'x'.repeat(10),
      'x'.repeat(5),
    ]);
  });
});

describe('getOutgoingMediaType', () => {
  it('sends only WhatsApp-supported formats as media', () => {
    expect(getOutgoingMediaType('image/png')).toBe('image');
    expect(getOutgoingMediaType('image/gif')).toBe('document');
    expect(getOutgoingMediaType('video/mp4')).toBe('video');
    expect(getOutgoingMediaType('audio/ogg')).toBe('audio');
    expect(getOutgoingMediaType('application/pdf')).toBe('document');
  });
});
