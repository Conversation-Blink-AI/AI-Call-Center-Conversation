// components/AddFundsButton.jsx
import { useEffect, useRef, useState } from 'react';

export default function AddFundsButton({ amount = 50, onBalanceUpdate }) {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  // 1) Fetch PayPal config from your new endpoint
  useEffect(() => {
    fetch('/api/paypal/config')
      .then(res => res.json())
      .then(json => {
        if (json.error) throw new Error(json.error);
        setConfig(json);
      })
      .catch(err => {
        console.error('Failed to fetch PayPal config:', err);
        setError('Unable to load payment configuration.');
      });
  }, []);

  // 2) Once config is available, load the SDK and render the button
  useEffect(() => {
    if (!config || !config.clientId || !containerRef.current) return;

    // Check if PayPal SDK is already loaded
    const existingScript = document.querySelector('script[src*="paypal.com/sdk/js"]');
    
    const renderPayPalButton = () => {
      if (!window.paypal || !containerRef.current) {
        setError('PayPal SDK not available.');
        return;
      }

      // Clear any existing content
      containerRef.current.innerHTML = '';

      window.paypal.Buttons({
        style: { shape: 'pill', color: 'blue', layout: 'vertical', label: 'pay' },

        // Create order on your backend
        createOrder: () =>
          fetch('/api/wallet/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
          })
            .then(res => res.json())
            .then(data => {
              if (!data.orderID) throw new Error('No orderID returned');
              return data.orderID;
            }),

        // Capture order and update balance
        onApprove: ({ orderID }) =>
          fetch('/api/wallet/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID })
          })
            .then(res => res.json())
            .then(json => {
              if (json.balance_cents == null) throw new Error(json.error || 'Invalid balance');
              onBalanceUpdate(json.balance_cents);
            }),

        onError: err => {
          console.error('PayPal error:', err);
          setError('Payment failed. Please try again.');
        },

        onCancel: () => {
          // optional: handle user cancellation
        }

      }).render(containerRef.current).catch(err => {
        console.error('PayPal render error:', err);
        setError('Failed to render PayPal button.');
      });
    };

    if (existingScript && window.paypal) {
      // SDK already loaded, render button immediately
      renderPayPalButton();
    } else {
      // Need to load the SDK
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${config.clientId}&currency=USD&intent=authorize${
        config.env === 'sandbox' ? '&vault=true' : ''
      }`;
      script.async = true;
      script.onload = renderPayPalButton;
      script.onerror = () => setError('Failed to load PayPal SDK');

      document.body.appendChild(script);
      
      // Cleanup function
      return () => {
        // Only clean up the container, not the script (other components might be using it)
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      };
    }

    // Cleanup for when SDK was already loaded
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [config, amount, onBalanceUpdate]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded">
        {error}
      </div>
    );
  }

  if (!config) {
    return <div>Loading payment configuration…</div>;
  }

  return <div ref={containerRef} className="min-h-[120px] flex justify-center items-center" />;
}
