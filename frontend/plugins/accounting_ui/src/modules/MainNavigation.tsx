import {
  IconClipboardTextFilled,
  IconCrane,
  IconListCheck,
  IconListDetails,
  IconRefreshAlert,
} from '@tabler/icons-react';

import { NavigationMenuLinkItem, sidebarPanelOpenState } from 'erxes-ui';
import { useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';

export const MainNavigation = () => {
  const { t } = useTranslation('accounting');
  const setReceiptsPanelOpen = useSetAtom(sidebarPanelOpenState);

  return (
    <>
      <NavigationMenuLinkItem
        name={t('receipts')}
        icon={IconListDetails}
        path="main"
        pathPrefix="accounting"
        onClick={() => setReceiptsPanelOpen(true)}
      />
      <NavigationMenuLinkItem
        name={t('journal-entries')}
        icon={IconListCheck}
        path="records"
        pathPrefix="accounting"
      />
      <NavigationMenuLinkItem
        name={t('incomplete-vouchers')}
        icon={IconCrane}
        path="odd-transactions"
        pathPrefix="accounting"
      />
      <NavigationMenuLinkItem
        name={t('report')}
        icon={IconClipboardTextFilled}
        path="journal-reports"
        pathPrefix="accounting"
      />
      <NavigationMenuLinkItem
        name={t('check-sync')}
        icon={IconRefreshAlert}
        path="check-sync"
        pathPrefix="accounting"
      />
    </>
  );
};
