import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { subscribeToAuthChanges, signInWithGoogle } from './services/authService';
import AppMobile from './AppMobile';

export default function AppNative() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setErrorMsg(err?.message || err?.code || JSON.stringify(err) || 'Gagal login. Coba lagi.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isAuthLoading) {
    return <div style={{ height: '100dvh', width: '100vw', backgroundColor: '#000' }} />;
  }

  if (!user) {
    return (
      <div style={{
        height: '100dvh', width: '100vw', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#000',
        padding: '24px', textAlign: 'center'
      }}>
        <h1 style={{ color: '#fff', fontSize: '32px', fontWeight: 600, marginBottom: '48px' }}>
          Cylen
        </h1>
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          style={{
            width: '100%', maxWidth: '320px', padding: '16px 24px', borderRadius: '100px',
            background: '#fff', color: '#000', border: 'none', fontSize: '16px',
            fontWeight: 600, cursor: isLoggingIn ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoggingIn ? 'Memuat...' : 'Masuk dengan Google'}
        </button>
        {errorMsg && <p style={{ color: '#e53e3e', fontSize: '13px', marginTop: '20px' }}>{errorMsg}</p>}
      </div>
    );
  }

  return <AppMobile />;
    }
