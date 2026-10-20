import { useMutation } from '@apollo/client';
import type { CellContext } from '@tanstack/react-table';
import { IconTool } from '@tabler/icons-react';
import { Command, Spinner, toast } from 'erxes-ui';
import type { IIntegration } from '@/integrations/types/Integration';
import { parseRepairResult } from '@/integrations/utils/repairResult';
import { IntegrationType } from '@/types/Integration';
import { WHATSAPP_REPAIR } from './graphql';
import { useWhatsappTranslation } from './translations';

/** Row menu item: re-registers the number if needed and re-subscribes webhooks. */
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
    <Command.Item value="repair" onSelect={handleRepair} disabled={loading}>
      {loading ? (
        <Spinner className="size-4 text-primary" />
      ) : (
        <IconTool size={16} />
      )}
      {t('repair')}
    </Command.Item>
  );
};
