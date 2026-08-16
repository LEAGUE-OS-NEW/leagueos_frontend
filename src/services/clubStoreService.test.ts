import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import apiClient from './apiClient.ts';
import {
  createClubProduct,
  fetchClubProducts,
  fetchClubStoreOrders,
  updateClubProduct,
} from './clubStoreService.ts';

vi.mock('./apiClient.ts', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const clubId =
  '11111111-1111-1111-1111-111111111111';

describe('clubStoreService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads persistent merchandise for the selected club', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        results: [
          {
            id: 'product-1',
            name: 'Home Jersey',
          },
        ],
      },
    });

    const products =
      await fetchClubProducts(
        clubId,
      );

    expect(apiClient.get).toHaveBeenCalledWith(
      `/clubs/${clubId}/merchandise/`,
    );

    expect(products).toHaveLength(1);
  });

  it('creates merchandise through the backend API', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        id: 'product-1',
        name: 'Home Jersey',
      },
    });

    const payload = {
      category: null,
      name: 'Home Jersey',
      description: '',
      price: '50000.00',
      currency: 'UGX',
      sku: 'HOME-001',
      stock: 20,
      low_stock_threshold: 20,
      images: [],
      metadata: {},
      status: 'ACTIVE' as const,
      is_featured: false,
    };

    await createClubProduct(
      clubId,
      payload,
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      `/clubs/${clubId}/merchandise/`,
      payload,
    );
  });

  it('persists restock/edit changes through PATCH', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: {
        id: 'product-1',
        stock: 70,
      },
    });

    await updateClubProduct(
      clubId,
      'product-1',
      {
        stock: 70,
      },
    );

    expect(apiClient.patch).toHaveBeenCalledWith(
      `/clubs/${clubId}/merchandise/product-1/`,
      {
        stock: 70,
      },
    );
  });

  it('loads real club store orders', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        results: [
          {
            id: 'order-1',
            status: 'PENDING',
          },
        ],
      },
    });

    const orders =
      await fetchClubStoreOrders(
        clubId,
      );

    expect(apiClient.get).toHaveBeenCalledWith(
      `/clubs/${clubId}/orders/`,
    );

    expect(orders).toHaveLength(1);
  });
});
