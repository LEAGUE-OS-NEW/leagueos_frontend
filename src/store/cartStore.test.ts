import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from './cartStore';

const testItem = {
  productId: 'home-shirt',
  clubSlug: 'city-oilers',
  name: 'City Oilers Home Shirt',
  price: 'UGX 120,000',
  priceValue: 120000,
  size: 'M',
  color: '#1d4ed8',
};

describe('cartStore account ownership', () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({
      ownerKey: 'guest',
      items: [],
      cartsByOwner: {},
    });
  });

  it('keeps cart items scoped to the active fan account', () => {
    useCartStore.getState().setCartOwner({ id: 'fan-a', email: 'fan-a@example.com' });
    useCartStore.getState().addItem(testItem);

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().totalItems()).toBe(1);

    useCartStore.getState().setCartOwner({ id: 'fan-b', email: 'fan-b@example.com' });

    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().totalItems()).toBe(0);

    useCartStore.getState().setCartOwner({ id: 'fan-a', email: 'fan-a@example.com' });

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].name).toBe(testItem.name);
  });
});
