import { useMutation, useQuery } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CellContext } from '@tanstack/react-table';
import { IconEdit, IconTool } from '@tabler/icons-react';
import {
  Button,
  Dialog,
  Form,
  Input,
  Separator,
  Spinner,
  toast,
} from 'erxes-ui';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { SelectBrand } from 'ui-modules';
import { z } from 'zod';
import { useIntegrationDetail } from '@/integrations/hooks/useIntegrationDetail';
import { useIntegrationEdit } from '@/integrations/hooks/useIntegrationEdit';
import type { IIntegration } from '@/integrations/types/Integration';
import { parseRepairResult } from '@/integrations/utils/repairResult';
import { IntegrationType } from '@/types/Integration';
import { WHATSAPP_CONNECTION, WHATSAPP_REPAIR } from './graphql';
import { WhatsappTranslationKey, useWhatsappTranslation } from './translations';

const getEditSchema = (t: (key: WhatsappTranslationKey) => string) =>
  z.object({
    name: z.string().trim().min(1, t('nameRequired')),
    brandId: z.string().min(1, t('brandRequired')),
  });

type EditValues = z.infer<ReturnType<typeof getEditSchema>>;

const WhatsappNumberDetails = ({
  integrationId,
}: {
  integrationId: string;
}) => {
  const { t } = useWhatsappTranslation();
  const { data, loading, error } = useQuery(WHATSAPP_CONNECTION, {
    variables: { integrationId },
  });
  const connection = data?.whatsappConnection;

  if (loading) return <Spinner size="sm" />;

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {error.message}
      </p>
    );
  }

  if (!connection) {
    return (
      <p className="text-sm text-muted-foreground">{t('connectionMissing')}</p>
    );
  }

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt className="text-muted-foreground">{t('phoneNumber')}</dt>
      <dd className="font-medium">{connection.displayPhoneNumber}</dd>
      {connection.verifiedName && (
        <>
          <dt className="text-muted-foreground">{t('businessName')}</dt>
          <dd>{connection.verifiedName}</dd>
        </>
      )}
      {connection.error && (
        <dd className="col-span-2 text-destructive">{connection.error}</dd>
      )}
    </dl>
  );
};

const WhatsappIntegrationEditForm = ({
  id,
  onDone,
}: {
  id: string;
  onDone: () => void;
}) => {
  const { t } = useWhatsappTranslation();
  const { loading, error, refetch, integrationDetail } = useIntegrationDetail({
    integrationId: id,
  });
  const { editIntegration, loading: saving } = useIntegrationEdit();
  const form = useForm<EditValues>({
    resolver: zodResolver(getEditSchema(t)),
    defaultValues: { name: '', brandId: '' },
  });

  useEffect(() => {
    if (integrationDetail) {
      form.reset({
        name: integrationDetail.name,
        brandId: integrationDetail.brandId ?? '',
      });
    }
  }, [integrationDetail, form]);

  const submit = (values: EditValues) => {
    editIntegration({
      variables: {
        _id: id,
        name: values.name.trim(),
        brandId: values.brandId,
        channelId: integrationDetail?.channelId || '',
      },
      onCompleted: () => {
        toast({ title: t('updated'), variant: 'success' });
        onDone();
      },
      onError: (error) => {
        toast({
          title: t('updateFailed'),
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  if (loading) return <Spinner className="p-20" />;

  if (error || !integrationDetail) {
    return (
      <div className="flex flex-col items-start gap-2 p-6 text-sm">
        <p role="alert" className="text-destructive">
          {t('detailLoadFailed')} {error?.message}
        </p>
        <Button type="button" variant="outline" onClick={() => void refetch()}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="space-y-6 p-6 pb-8">
          <WhatsappNumberDetails integrationId={id} />
          <Form.Field
            control={form.control}
            name="name"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t('name')}</Form.Label>
                <Form.Control>
                  <Input {...field} />
                </Form.Control>
                <Form.Message />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="brandId"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t('brand')}</Form.Label>
                <Form.Control>
                  <SelectBrand
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={t('chooseBrand')}
                    className="w-full"
                  />
                </Form.Control>
                <Form.Message />
              </Form.Item>
            )}
          />
        </div>
        <Separator />
        <Dialog.Footer className="flex justify-end px-6 py-4">
          <Dialog.Close asChild>
            <Button type="button" variant="ghost" disabled={saving}>
              {t('close')}
            </Button>
          </Dialog.Close>
          <Button type="submit" disabled={saving}>
            {saving && <Spinner size="sm" />}
            {t('save')}
          </Button>
        </Dialog.Footer>
      </form>
    </Form>
  );
};

/** Row action: edit the inbox name and brand, with the number shown read-only. */
export const WhatsappIntegrationActions = ({
  cell,
}: {
  cell: CellContext<IIntegration, unknown>;
}) => {
  const { t } = useWhatsappTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <div className="flex w-full items-center gap-2">
          <IconEdit size={16} />
          {t('edit')}
        </div>
      </Dialog.Trigger>
      <Dialog.Content className="gap-0 border-0 p-0 shadow-lg">
        <Dialog.Header className="px-4 py-3">
          <Dialog.Title>{cell.row.original.name}</Dialog.Title>
        </Dialog.Header>
        <Separator />
        {open && (
          <WhatsappIntegrationEditForm
            id={cell.row.original._id}
            onDone={() => setOpen(false)}
          />
        )}
      </Dialog.Content>
    </Dialog>
  );
};

/** Row action: re-registers the number if needed and re-subscribes webhooks. */
export const WhatsappIntegrationRepair = ({
  cell,
}: {
  cell: CellContext<IIntegration, unknown>;
}) => {
  const { t } = useWhatsappTranslation();
  const [repair, { loading }] = useMutation(WHATSAPP_REPAIR, {
    refetchQueries: ['Integrations', 'frontlineWhatsappConnection'],
  });

  const handleRepair = () => {
    if (loading) return;

    repair({
      variables: {
        _id: cell.row.original._id,
        kind: IntegrationType.WHATSAPP_MESSENGER,
      },
      onCompleted: (data) => {
        const result = parseRepairResult(data.integrationsRepair);

        if (result.failed) {
          toast({
            title: t('repairFailed'),
            description: result.message,
            variant: 'destructive',
          });
          return;
        }

        toast({ title: t('repaired'), variant: 'success' });
      },
      onError: (error) =>
        toast({
          title: t('repairFailed'),
          description: error.message,
          variant: 'destructive',
        }),
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRepair}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleRepair();
        }
      }}
      className="flex w-full items-center gap-2"
    >
      {loading ? (
        <Spinner className="size-4 text-primary" />
      ) : (
        <IconTool size={16} />
      )}
      {t('repair')}
    </div>
  );
};
