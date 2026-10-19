import { Schema } from 'mongoose';
import { mongooseStringRandomId } from 'erxes-api-shared/utils';

export const whatsappIntegrationSchema = new Schema(
  {
    _id: mongooseStringRandomId,
    erxesApiId: {
      type: String,
      label: 'Inbox integration id',
      unique: true,
      sparse: true,
    },
    businessId: { type: String, label: 'Meta business portfolio id' },
    wabaId: {
      type: String,
      required: true,
      index: true,
      label: 'WhatsApp Business Account id',
    },
    phoneNumberId: {
      type: String,
      required: true,
      unique: true,
      label: 'WhatsApp phone number id',
    },
    displayPhoneNumber: { type: String, required: true },
    verifiedName: { type: String },
    phoneStatus: { type: String },
    accessToken: {
      type: String,
      required: true,
      select: false,
      label: 'Business integration system user token',
    },
    registrationPin: {
      type: String,
      select: false,
      label: 'Two-step verification PIN used to register the number',
    },
    healthStatus: {
      type: String,
      enum: ['healthy', 'unhealthy'],
      default: 'healthy',
    },
    error: { type: String },
    connectedBy: { type: String, required: true },
  },
  { timestamps: true },
);
