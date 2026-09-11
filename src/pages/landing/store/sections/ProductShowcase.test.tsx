import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { useClubProductStore } from '../../../../store/clubProductStore';

import ProductShowcase from './ProductShowcase';

const oldTimestamp = Date.now() - 10 * 24 * 60 * 60 * 1000;

afterEach(() => {
  useClubProductStore.setState({ products: [] });
});

describe('ProductShowcase', () => {
  it('renders each product id only once', () => {
    useClubProductStore.setState({
      products: [
        {
          id: 'home-jersey',
          clubSlug: 'fan-alpha',
          clubName: 'Fan Alpha',
          name: 'Official Home Jersey',
          category: 'jerseys',
          price: 'UGX 90,000',
          priceValue: 90000,
          stock: 8,
          accentColor: '#991b1b',
          createdAt: oldTimestamp,
        },
        {
          id: 'home-jersey',
          clubSlug: 'fan-alpha',
          clubName: 'Fan Alpha',
          name: 'Official Home Jersey',
          category: 'jerseys',
          price: 'UGX 90,000',
          priceValue: 90000,
          stock: 8,
          accentColor: '#991b1b',
          createdAt: oldTimestamp,
        },
      ],
    });

    render(
      <MemoryRouter>
        <ProductShowcase activeCategory="all" />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Official Home Jersey')).toHaveLength(1);
  });
});
