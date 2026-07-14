import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('DehatiAI crash:', error, info);
  }

  handleReset = () => {
    // Clear SW caches and reload fresh
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(regs => Promise.all(regs.map(r => r.unregister())))
        .then(() => caches?.keys?.())
        .then(names => names && Promise.all(names.map(n => caches.delete(n))))
        .finally(() => location.reload(true));
    } else {
      location.reload(true);
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100dvh',
        background: '#FBF3E1',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px', direction: 'rtl', textAlign: 'center',
        fontFamily: '"Noto Nastaliq Urdu", serif'
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🌾</div>
        <h2 style={{ color: '#2F4A1E', fontSize: '1.2rem', marginBottom: 10, fontWeight: 800 }}>
          کچھ مسئلہ ہو گیا
        </h2>
        <p style={{ color: '#555', fontSize: '.88rem', lineHeight: 1.8, maxWidth: 300, marginBottom: 24 }}>
          ایپ لوڈ نہیں ہو سکی۔ دوبارہ کوشش کریں یا انٹرنیٹ چیک کریں۔
        </p>
        <button
          onClick={this.handleReset}
          style={{
            background: '#2F4A1E', color: 'white',
            border: 'none', borderRadius: 12,
            padding: '14px 32px', fontSize: '1rem',
            fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(47,74,30,.3)',
            fontFamily: '"Noto Nastaliq Urdu", serif'
          }}
        >
          🔄 دوبارہ کوشش کریں
        </button>
        <p style={{ marginTop: 16, fontSize: '.7rem', color: '#999', fontFamily: 'Inter, sans-serif' }}>
          Error: {this.state.error?.message?.slice(0, 60)}
        </p>
      </div>
    );
  }
}
