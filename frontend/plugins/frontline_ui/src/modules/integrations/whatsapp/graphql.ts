import { gql } from '@apollo/client';

export interface WhatsappConfig {
  appId: string;
  configId: string;
  verifyToken: string;
  hasAppSecret: boolean;
  webhookUrl: string;
}

export interface WhatsappEmbeddedSignupConfig {
  appId: string;
  configId: string;
  graphVersion: string;
  isConfigured: boolean;
}

export interface WhatsappConnection {
  _id: string;
  erxesApiId?: string | null;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName?: string | null;
  phoneStatus?: string | null;
  needsRegistration: boolean;
  healthStatus: string;
  error?: string | null;
}

const WHATSAPP_CONFIG_FIELDS = gql`
  fragment frontlineWhatsappConfigFields on WhatsappConfig {
    appId
    configId
    verifyToken
    hasAppSecret
    webhookUrl
  }
`;

const WHATSAPP_CONNECTION_FIELDS = gql`
  fragment frontlineWhatsappConnectionFields on WhatsappConnection {
    _id
    erxesApiId
    wabaId
    phoneNumberId
    displayPhoneNumber
    verifiedName
    phoneStatus
    needsRegistration
    healthStatus
    error
  }
`;

export const WHATSAPP_CONFIG = gql`
  query frontlineWhatsappConfig {
    whatsappConfig {
      ...frontlineWhatsappConfigFields
    }
  }
  ${WHATSAPP_CONFIG_FIELDS}
`;

export const WHATSAPP_UPDATE_CONFIG = gql`
  mutation frontlineWhatsappUpdateConfig(
    $appId: String!
    $appSecret: String
    $configId: String!
    $verifyToken: String
  ) {
    whatsappUpdateConfig(
      appId: $appId
      appSecret: $appSecret
      configId: $configId
      verifyToken: $verifyToken
    ) {
      ...frontlineWhatsappConfigFields
    }
  }
  ${WHATSAPP_CONFIG_FIELDS}
`;

export const WHATSAPP_EMBEDDED_SIGNUP_CONFIG = gql`
  query frontlineWhatsappEmbeddedSignupConfig {
    whatsappEmbeddedSignupConfig {
      appId
      configId
      graphVersion
      isConfigured
    }
  }
`;

export const WHATSAPP_EMBEDDED_SIGNUP_FINISH = gql`
  mutation frontlineWhatsappEmbeddedSignupFinish(
    $code: String!
    $wabaId: String!
    $phoneNumberId: String!
    $businessId: String
  ) {
    whatsappEmbeddedSignupFinish(
      code: $code
      wabaId: $wabaId
      phoneNumberId: $phoneNumberId
      businessId: $businessId
    ) {
      ...frontlineWhatsappConnectionFields
    }
  }
  ${WHATSAPP_CONNECTION_FIELDS}
`;

export const WHATSAPP_CONNECTION = gql`
  query frontlineWhatsappConnection($integrationId: String!) {
    whatsappConnection(integrationId: $integrationId) {
      ...frontlineWhatsappConnectionFields
    }
  }
  ${WHATSAPP_CONNECTION_FIELDS}
`;

export const WHATSAPP_REPAIR = gql`
  mutation frontlineWhatsappRepair($_id: String!, $kind: String!) {
    integrationsRepair(_id: $_id, kind: $kind)
  }
`;
