import { IAccountCategory } from '../../types/AccountCategory';
import { filterAccountCategories } from '../filterAccountCategories';

const category = (
  _id: string,
  code: string,
  name: string,
  parentId?: string,
): IAccountCategory => ({ _id, code, name, parentId });

const categories = [
  category('root', '0001', 'Дансны нэгдсэн төлөвлөгөө'),
  category('assets', '0010', 'Хөрөнгө', 'root'),
  category('current', '0011', 'Эргэлтийн хөрөнгө', 'assets'),
  category('fixed', '0013', 'Биет хөрөнгө', 'assets'),
  category('main', '200', 'Үндсэн хөрөнгө', 'fixed'),
  category('other', '001', 'a-category-1'),
];

const ids = (list: IAccountCategory[]) => list.map(({ _id }) => _id);

describe('filterAccountCategories', () => {
  it('returns every category when no filter is set', () => {
    const result = filterAccountCategories(categories, {});

    expect(result.isFiltered).toBe(false);
    expect(ids(result.categories)).toEqual(ids(categories));
  });

  it('matches by code and keeps ancestors as context in order', () => {
    const result = filterAccountCategories(categories, { searchValue: '200' });

    expect(ids(result.categories)).toEqual(['root', 'assets', 'fixed', 'main']);
    expect([...result.matchedIds]).toEqual(['main']);
  });

  it('matches by name case-insensitively', () => {
    const result = filterAccountCategories(categories, {
      searchValue: 'A-CATEGORY',
    });

    expect(ids(result.categories)).toEqual(['other']);
  });

  it('limits matches to the selected category subtree', () => {
    const result = filterAccountCategories(categories, {
      categoryId: 'fixed',
    });

    expect([...result.matchedIds]).toEqual(['fixed', 'main']);
    expect(ids(result.categories)).toEqual(['root', 'assets', 'fixed', 'main']);
  });

  it('returns nothing when the search has no match', () => {
    const result = filterAccountCategories(categories, { searchValue: 'zzz' });

    expect(result.categories).toEqual([]);
    expect(result.matchedIds.size).toBe(0);
  });
});
