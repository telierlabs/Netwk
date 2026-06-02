import React, { useState } from 'react';

interface PermissionPageProps {
  onComplete: () => void;
}

export const PermissionPage: React.FC<PermissionPageProps> = ({ onComplete }) => {
  const [micStatus, setMicStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [geoStatus, setGeoStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [loading, setLoading] = useState(false);

  const requestMicrophone = () => {
    setMicStatus('granted');
  };

  const requestLocation = () => {
    setGeoStatus('granted');
  };

  const handleNext = () => {
    setLoading(true);
    setTimeout(() => {
      onComplete();
    }, 1000);
  };

  const canProceed = micStatus === 'granted' && geoStatus === 'granted';

  return (
    <div style={{
      backgroundColor: '#010101', // Hitam dop penuh sewajah web
      color: '#FFFFFF',
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      padding: '24px',
      boxSizing: 'border-box'
    }}>
      {/* Konten langsung loss di background tanpa box/kartu pembungkus */}
      <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 600, margin: 0, letterSpacing: '-0.5px' }}>
            Set Up Your Environment
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '12px', lineHeight: 1.5 }}>
            Izinkan akses berikut untuk mengaktifkan fitur real-time AI secara penuh.
          </p>
        </div>

        {/* Opsi Mikrofon - Seamless tanpa border kotak luar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0A0A0A',
          padding: '20px',
          borderRadius: '14px',
          marginBottom: '16px',
          border: '1px solid #141414'
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '15px', fontWeight: 500 }}>Microphone Access</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>Dibutuhkan untuk fitur Voice AI</div>
          </div>
          <button
            onClick={requestMicrophone}
            disabled={micStatus === 'granted'}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#000000',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: micStatus === 'granted' ? 'default' : 'pointer',
              opacity: micStatus === 'granted' ? 0.3 : 1,
              transition: 'all 0.2s ease',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {micStatus === 'granted' ? 'Diizinkan ✓' : 'Izinkan'}
          </button>
        </div>

        {/* Opsi Lokasi - Seamless tanpa border kotak luar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0A0A0A',
          padding: '20px',
          borderRadius: '14px',
          marginBottom: '40px',
          border: '1px solid #141414'
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '15px', fontWeight: 500 }}>Location Access</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>Untuk pencarian AI lokal akurat</div>
          </div>
          <button
            onClick={requestLocation}
            disabled={geoStatus === 'granted'}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#000000',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: geoStatus === 'granted' ? 'default' : 'pointer',
              opacity: geoStatus === 'granted' ? 0.3 : 1,
              transition: 'all 0.2s ease',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {geoStatus === 'granted' ? 'Diizinkan ✓' : 'Izinkan'}
          </button>
        </div>

        {/* Tombol Lanjut Utama */}
        <button
          onClick={handleNext}
          disabled={!canProceed || loading}
          style={{
            width: '100%',
            backgroundColor: canProceed ? '#FFFFFF' : '#1A1A1A',
            color: canProceed ? '#000000' : '#444444',
            border: 'none',
            borderRadius: '14px',
            padding: '16px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: !canProceed ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: loading ? 0.5 : 1,
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          {loading ? 'Menyiapkan...' : 'Lanjut'}
        </button>
        
      </div>
    </div>
  );
};
