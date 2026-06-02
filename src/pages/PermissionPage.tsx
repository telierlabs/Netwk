import React, { useState } from 'react';

interface PermissionPageProps {
  onComplete: () => void;
}

export const PermissionPage: React.FC<PermissionPageProps> = ({ onComplete }) => {
  const [micStatus, setMicStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [geoStatus, setGeoStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [loading, setLoading] = useState(false);

  // Request izin Microphone
  const requestMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus('granted');
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      setMicStatus('denied');
      console.log('Mic permission denied', err);
    }
  };

  // Request izin Lokasi
  const requestLocation = () => {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
      () => {
        setGeoStatus('granted');
      },
      (err) => {
        setGeoStatus('denied');
        console.log('Location permission denied', err);
      }
    );
  };

  const handleNext = () => {
    setLoading(true);
    setTimeout(() => {
      onComplete();
    }, 1000);
  };

  return (
    <div style={{
      backgroundColor: '#0A0A0A',
      color: '#FFFFFF',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        backgroundColor: '#121212',
        border: '1px solid #222',
        borderRadius: '16px',
        padding: '32px',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            fontSize: '14px',
            color: '#888',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: '8px'
          }}>Cylen Workspace</div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0, letterSpacing: '-0.5px' }}>
            Set Up Your Environment
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
            Izinkan akses berikut untuk mengaktifkan fitur real-time AI secara penuh tanpa gangguan popup.
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#1A1A1A',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '16px',
          border: '1px solid #262626'
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '15px', fontWeight: 500 }}>Microphone Access</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Dibutuhkan untuk fitur Voice AI</div>
          </div>
          <button
            onClick={requestMicrophone}
            disabled={micStatus === 'granted'}
            style={{
              backgroundColor: micStatus === 'granted' ? '#10B981' : '#FFFFFF',
              color: micStatus === 'granted' ? '#FFFFFF' : '#000000',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: micStatus === 'granted' ? 'default' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {micStatus === 'granted' ? 'Allowed ✓' : 'Grant'}
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#1A1A1A',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '32px',
          border: '1px solid #262626'
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '15px', fontWeight: 500 }}>Location Access</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Untuk pencarian AI lokal akurat</div>
          </div>
          <button
            onClick={requestLocation}
            disabled={geoStatus === 'granted'}
            style={{
              backgroundColor: geoStatus === 'granted' ? '#10B981' : '#FFFFFF',
              color: geoStatus === 'granted' ? '#FFFFFF' : '#000000',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: geoStatus === 'granted' ? 'default' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {geoStatus === 'granted' ? 'Allowed ✓' : 'Grant'}
          </button>
        </div>

        <button
          onClick={handleNext}
          disabled={loading}
          style={{
            width: '100%',
            backgroundColor: '#FFFFFF',
            color: '#000000',
            border: 'none',
            borderRadius: '12px',
            padding: '14px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 0.2s ease',
            opacity: loading ? 0.5 : 1
          }}
        >
          {loading ? 'Configuring Workspace...' : 'Launch Workspace'}
        </button>
      </div>
    </div>
  );
};
