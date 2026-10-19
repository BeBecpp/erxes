import { useMultiQueryState } from 'erxes-ui';
import { useMemo } from 'react';
import { filterAccountCategories } from '../utils/filterAccountCategories';
import { useAccountCategories } from './useAccountCategories';

/** Account categories narrowed by the page's `searchValue` and `categoryId`. */
export const useFilteredAccountCategories = () => {
  const [{ searchValue, categoryId }] = useMultiQueryState<{
    searchValue: string;
    categoryId: string;
  }>(['searchValue', 'categoryId']);
  const { accountCategories, loading, error } = useAccountCategories();

  const filtered = useMemo(
    () =>
      filterAccountCategories(accountCategories ?? [], {
        searchValue,
        categoryId,
      }),
    [accountCategories, searchValue, categoryId],
  );

  return {
    allCategories: accountCategories,
    loading,
    error,
    ...filtered,
  };
};
