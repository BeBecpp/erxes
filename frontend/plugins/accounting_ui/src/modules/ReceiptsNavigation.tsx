import {
  IconBuilding,
  IconCaretDownFilled,
  IconSitemap,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import {
  Button,
  cn,
  NavigationMenuGroup,
  Sidebar,
  useQueryState,
} from 'erxes-ui';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBranchesMain, useDepartmentsMain } from 'ui-modules';
import { TR_JOURNAL_GROUPS } from './transactions/types/constants';

const SIDEBAR_STRUCTURE_LIMIT = 100;

type ReceiptsNavigationOption = {
  _id: string;
  label: string;
  code?: string;
  parentId?: string;
};

type ReceiptsNavigationTree = {
  ancestors: Map<string, string[]>;
  parentIds: Set<string>;
};

const buildReceiptsNavigationTree = (
  options: ReceiptsNavigationOption[],
): ReceiptsNavigationTree => {
  const parentById = new Map<string, string>();

  for (const option of options) {
    if (option.parentId) {
      parentById.set(option._id, option.parentId);
    }
  }

  const ids = new Set(options.map((option) => option._id));
  const ancestors = new Map<string, string[]>();
  const parentIds = new Set<string>();

  for (const option of options) {
    const chain: string[] = [];
    let parentId = parentById.get(option._id);

    while (parentId && ids.has(parentId) && !chain.includes(parentId)) {
      chain.push(parentId);
      parentId = parentById.get(parentId);
    }

    ancestors.set(option._id, chain);

    if (chain.length) {
      parentIds.add(chain[0]);
    }
  }

  return { ancestors, parentIds };
};

const sortByOrder = <T extends { order?: string }>(items: T[]) =>
  [...items].sort((a, b) => (a.order || '').localeCompare(b.order || ''));

const ReceiptsNavigationItems = ({
  queryKey,
  icon: ItemIcon,
  options,
  loading,
}: {
  queryKey: 'branchId' | 'departmentId' | 'journal';
  icon: Icon;
  options: ReceiptsNavigationOption[];
  loading?: boolean;
}) => {
  const { t } = useTranslation('accounting');
  const [selected, setSelected] = useQueryState<string>(queryKey);
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);
  const { ancestors, parentIds } = buildReceiptsNavigationTree(options);
  const isTree = parentIds.size > 0;

  const toggleCollapsed = (id: string) =>
    setCollapsedIds((prev) =>
      prev.includes(id)
        ? prev.filter((prevId) => prevId !== id)
        : [...prev, id],
    );

  if (loading) {
    return (
      <>
        <Sidebar.MenuSkeleton showIcon />
        <Sidebar.MenuSkeleton showIcon />
      </>
    );
  }

  if (!options.length) {
    return (
      <span className="px-2 py-1 text-xs text-muted-foreground">
        {t('no-results-found')}
      </span>
    );
  }

  return (
    <>
      {options.map((option) => {
        const isActive = selected === option._id;
        const optionAncestors = ancestors.get(option._id) || [];

        if (optionAncestors.some((id) => collapsedIds.includes(id))) {
          return null;
        }

        const hasChildren = parentIds.has(option._id);
        const isCollapsed = collapsedIds.includes(option._id);

        return (
          <Sidebar.MenuItem
            key={option._id}
            className={cn(isTree && 'flex items-center')}
          >
            {optionAncestors.map((ancestorId) => (
              <span
                key={ancestorId}
                aria-hidden
                className="relative h-8 w-4 shrink-0 before:absolute before:inset-y-0 before:left-1/2 before:w-px before:bg-border"
              />
            ))}
            {isTree &&
              (hasChildren ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  aria-label={option.label}
                  aria-expanded={!isCollapsed}
                  onClick={() => toggleCollapsed(option._id)}
                >
                  <IconCaretDownFilled
                    className={cn(
                      'transition-transform',
                      isCollapsed && '-rotate-90',
                    )}
                  />
                </Button>
              ) : (
                <span aria-hidden className="size-6 shrink-0" />
              ))}
            <Sidebar.MenuButton
              className={cn(isTree && 'min-w-0 flex-1')}
              isActive={isActive}
              title={option.label}
              onClick={() => setSelected(isActive ? null : option._id)}
            >
              <ItemIcon
                className={cn(
                  'text-accent-foreground',
                  isActive && 'text-primary',
                )}
              />
              {option.code && (
                <span className="shrink-0 text-muted-foreground">
                  {option.code}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        );
      })}
    </>
  );
};

const ReceiptsBranchesNavigation = () => {
  const { t } = useTranslation('accounting');
  const { sortedBranches, loading } = useBranchesMain({
    variables: { limit: SIDEBAR_STRUCTURE_LIMIT },
  });

  return (
    <NavigationMenuGroup name={t('branch')} separate={false}>
      <ReceiptsNavigationItems
        queryKey="branchId"
        icon={IconBuilding}
        loading={loading}
        options={sortedBranches.map((branch) => ({
          _id: branch._id,
          label: branch.title,
          code: branch.code,
          parentId: branch.parentId,
        }))}
      />
    </NavigationMenuGroup>
  );
};

const ReceiptsDepartmentsNavigation = () => {
  const { t } = useTranslation('accounting');
  const { departments, loading } = useDepartmentsMain({
    variables: { limit: SIDEBAR_STRUCTURE_LIMIT },
  });

  return (
    <NavigationMenuGroup name={t('department')}>
      <ReceiptsNavigationItems
        queryKey="departmentId"
        icon={IconSitemap}
        loading={loading}
        options={sortByOrder(departments || []).map((department) => ({
          _id: department._id,
          label: department.title,
          code: department.code,
          parentId: department.parentId,
        }))}
      />
    </NavigationMenuGroup>
  );
};

export const ReceiptsNavigation = () => {
  const { t } = useTranslation('accounting');

  return (
    <Sidebar.Panel
      className="w-56 flex-none border-r lg:w-64"
      label={t('receipts')}
    >
      <ReceiptsBranchesNavigation />
      <ReceiptsDepartmentsNavigation />
      <NavigationMenuGroup name={t('journal')}>
        {TR_JOURNAL_GROUPS.map((group, index) => (
          <Fragment key={group.label}>
            <Sidebar.MenuItem>
              <span
                className={cn(
                  'block px-2 pb-1 text-xs text-muted-foreground',
                  index > 0 && 'pt-2',
                )}
              >
                {t(group.label)}
              </span>
            </Sidebar.MenuItem>
            <ReceiptsNavigationItems
              queryKey="journal"
              icon={group.icon}
              options={group.items.map((item) => ({
                _id: item.journal,
                label: t(item.label),
              }))}
            />
          </Fragment>
        ))}
      </NavigationMenuGroup>
    </Sidebar.Panel>
  );
};
