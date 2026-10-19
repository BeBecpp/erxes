import { promises as fsPromises } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import type { IAttachment } from 'erxes-api-shared/core-types';
import { sanitizeFilename, uploadFileToStorage } from 'erxes-api-shared/utils';
import { downloadWhatsappMedia } from '@/integrations/whatsapp/graphApi';
import { IWhatsappMediaRef } from '@/integrations/whatsapp/utils/content';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/3gpp': '3gp',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/amr': 'amr',
  'application/pdf': 'pdf',
};

const getFileName = (media: IWhatsappMediaRef, mimeType: string) => {
  if (media.fileName) {
    const name = sanitizeFilename(basename(media.fileName.replace(/\\/g, '/')));

    if (name) return name;
  }

  const extension = EXTENSIONS[mimeType.split(';')[0].trim()];

  return extension ? `whatsapp-${media.kind}.${extension}` : `whatsapp-${media.kind}`;
};

/** Downloads webhook media from Meta into workspace storage; Meta's URL expires within minutes. */
export const storeWhatsappMedia = async ({
  subdomain,
  accessToken,
  media,
}: {
  subdomain: string;
  accessToken: string;
  media: IWhatsappMediaRef;
}): Promise<IAttachment> => {
  const { buffer, mimeType: downloadedType } = await downloadWhatsappMedia(
    accessToken,
    media.id,
  );
  const type = (media.mimeType || downloadedType || 'application/octet-stream')
    .split(';')[0]
    .trim();
  const name = getFileName(media, type);

  let temporaryDirectory: string | undefined;

  try {
    temporaryDirectory = await fsPromises.mkdtemp(join(tmpdir(), 'whatsapp-'));

    const filePath = join(temporaryDirectory, 'attachment');

    await fsPromises.writeFile(filePath, buffer, { mode: 0o600 });

    const url = await uploadFileToStorage({
      subdomain,
      filePath,
      fileName: name,
      mimetype: type,
    });

    if (!url.trim()) {
      throw new Error('Storage did not return a file location.');
    }

    return { name, type, url, size: buffer.byteLength };
  } finally {
    if (temporaryDirectory) {
      await fsPromises
        .rm(temporaryDirectory, { recursive: true, force: true })
        .catch(() => undefined);
    }
  }
};
