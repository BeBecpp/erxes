import { z } from 'zod';
import { IModels } from '~/connectionResolvers';
import { IWhatsappCustomerDocument } from '@/integrations/whatsapp/@types/customers';
import {
  WHATSAPP_ERROR_CODES,
  WHATSAPP_TEXT_LIMIT,
} from '@/integrations/whatsapp/constants';
import { getWhatsappCustomerIdFromConversation } from '@/integrations/whatsapp/controller/store';
import { debugWhatsapp } from '@/integrations/whatsapp/debuggers';
import { generateWhatsappAttachmentUrl } from '@/integrations/whatsapp/utils/attachments';
import { markWhatsappReplyInFlight } from '@/integrations/whatsapp/utils/inFlight';
import {
  WhatsappGraphError,
  WhatsappOutgoingContent,
  WhatsappRecipient,
  sendWhatsappMessage,
} from '@/integrations/whatsapp/graphApi';
import {
  getOutgoingMediaType,
  htmlToWhatsappText,
  splitWhatsappText,
} from '@/integrations/whatsapp/utils/content';

const replySchema = z.object({
  integrationId: z.string().min(1),
  conversationId: z.string().min(1),
  content: z.string().optional().default(''),
  attachments: z
    .array(
      z
        .object({
          url: z.string().min(1),
          name: z.string().optional(),
          type: z.string().optional(),
        })
        .passthrough(),
    )
    .optional()
    .default([]),
});

export interface IWhatsappReplyResult {
  status: 'success';
  data: {
    conversationId: string;
    content: string;
    deliveryStatus: 'sent';
    extraData: { whatsapp: { messageIds: string[] } };
  };
}

export const getWhatsappRecipient = (
  customer: Pick<IWhatsappCustomerDocument, 'waId' | 'userId'>,
): WhatsappRecipient => {
  if (customer.waId) return { to: customer.waId };
  if (customer.userId) return { recipient: customer.userId };

  throw new Error('This WhatsApp contact has no reachable address');
};

/** Builds the provider messages for a composer reply: text parts first, then each attachment. */
export const buildWhatsappReplyParts = (
  subdomain: string,
  content: string,
  attachments: z.infer<typeof replySchema>['attachments'],
): WhatsappOutgoingContent[] => {
  const textParts: WhatsappOutgoingContent[] = splitWhatsappText(
    htmlToWhatsappText(content),
    WHATSAPP_TEXT_LIMIT,
  ).map((body) => ({ type: 'text', text: { body, preview_url: true } }));

  const mediaParts: WhatsappOutgoingContent[] = attachments.map(
    (attachment) => {
      const type = getOutgoingMediaType(attachment.type || '');

      return {
        type,
        media: {
          link: generateWhatsappAttachmentUrl(subdomain, attachment.url),
          ...(type === 'document' && attachment.name
            ? { filename: attachment.name }
            : {}),
        },
      };
    },
  );

  return [...textParts, ...mediaParts];
};

/** Turns Meta errors into a message an agent can act on. */
export const describeWhatsappSendError = (error: unknown): string => {
  if (!(error instanceof WhatsappGraphError)) {
    return error instanceof Error
      ? error.message
      : 'Could not send to WhatsApp';
  }

  switch (error.code) {
    case WHATSAPP_ERROR_CODES.OUTSIDE_SERVICE_WINDOW:
      return 'More than 24 hours have passed since the customer last wrote. WhatsApp only allows template messages until they reply.';
    case WHATSAPP_ERROR_CODES.PAYMENT_METHOD:
      return 'The WhatsApp Business Account has no valid payment method. Add one in WhatsApp Manager.';
    case WHATSAPP_ERROR_CODES.NOT_REGISTERED:
      return 'This WhatsApp number is not registered for the Cloud API. Repair the integration.';
    case WHATSAPP_ERROR_CODES.TOKEN_EXPIRED:
      return 'WhatsApp access was revoked or expired. Remove the integration and connect the number again.';
    default:
      return error.message;
  }
};

const isConnectionError = (error: unknown) =>
  error instanceof WhatsappGraphError &&
  (error.code === WHATSAPP_ERROR_CODES.TOKEN_EXPIRED ||
    error.code === WHATSAPP_ERROR_CODES.NOT_REGISTERED);

/** Sends an inbox reply to the conversation's WhatsApp contact. */
export const sendWhatsappReply = async ({
  models,
  subdomain,
  payload,
}: {
  models: IModels;
  subdomain: string;
  payload: unknown;
}): Promise<IWhatsappReplyResult> => {
  const parsed = replySchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error('Invalid WhatsApp reply data');
  }

  const { integrationId, conversationId, content, attachments } = parsed.data;
  const customerId = getWhatsappCustomerIdFromConversation(conversationId);
  const customer = customerId
    ? await models.WhatsappCustomers.findOne({ _id: customerId, integrationId })
    : null;

  if (!customer) {
    throw new Error('WhatsApp contact not found for this conversation');
  }

  const connection = await models.WhatsappIntegrations.getByIntegrationId(
    integrationId,
  );
  const parts = buildWhatsappReplyParts(subdomain, content, attachments);

  if (!parts.length) {
    throw new Error('Write a message or attach a file before sending');
  }

  const recipient = getWhatsappRecipient(customer);
  const messageIds: string[] = [];

  for (const part of parts) {
    let wamid: string;

    try {
      wamid = await sendWhatsappMessage(
        connection.accessToken,
        connection.phoneNumberId,
        recipient,
        part,
      );
    } catch (error) {
      const message = describeWhatsappSendError(error);

      if (isConnectionError(error)) {
        await models.WhatsappIntegrations.markHealth(connection._id, message);
      }

      throw new Error(
        messageIds.length
          ? `Only part of the reply reached WhatsApp. ${message}`
          : message,
      );
    }

    messageIds.push(wamid);

    // The part is already delivered; a missing marker only loses early statuses.
    await markWhatsappReplyInFlight(subdomain, wamid).catch((error) =>
      debugWhatsapp(
        `WhatsApp in-flight marker failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ),
    );
  }

  if (connection.healthStatus !== 'healthy') {
    await models.WhatsappIntegrations.markHealth(connection._id);
  }

  return {
    status: 'success',
    data: {
      conversationId,
      content,
      deliveryStatus: 'sent',
      extraData: { whatsapp: { messageIds } },
    },
  };
};
