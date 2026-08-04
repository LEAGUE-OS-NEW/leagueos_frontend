import type { ReactNode } from 'react';
import { FiTruck, FiCreditCard, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import './TrustBar.css';

const PAYMENT_METHODS = ['MTN MoMo', 'Airtel Money', 'Visa', 'Mastercard'];

type TrustItem = {
  label: string;
  description: ReactNode;
  icon: ReactNode;
};

const TRUST_ITEMS: TrustItem[] = [
  {
    label: 'Delivered Nationwide',
    description: 'Fast & reliable delivery to all regions in Uganda.',
    icon: <FiTruck />,
  },
  {
    label: 'Pay Your Way',
    description: (
      <span className="trust-bar-payment-methods">
        {PAYMENT_METHODS.map((method) => (
          <span className="trust-bar-payment-chip" key={method}>
            {method}
          </span>
        ))}
      </span>
    ),
    icon: <FiCreditCard />,
  },
  {
    label: 'Secure & Trusted',
    description: 'Your payments are safe with industry-leading security.',
    icon: <FiCheckCircle />,
  },
  {
    label: 'Easy Returns',
    description: 'Not happy? Return within 7 days of delivery.',
    icon: <FiRefreshCw />,
  },
];

function TrustBar() {
  return (
    <section className="store-panel trust-bar" aria-label="Store trust information">
      {TRUST_ITEMS.map((item) => (
        <div className="trust-bar-item" key={item.label}>
          <span className="trust-bar-icon">{item.icon}</span>
          <div>
            <p className="trust-bar-label">{item.label}</p>
            <p className="trust-bar-desc">{item.description}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

export default TrustBar;
