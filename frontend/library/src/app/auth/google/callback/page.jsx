'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function GoogleCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing...');
  const [error, setError] = useState('');

  useEffect(() => {  
    const handleCallback = async () => {  
      try {  
        const code = searchParams.get('code');  
        const stateParam = searchParams.get('state');  
        const errorParam = searchParams.get('error');  
  
        if (errorParam) {  
          setError('Google authentication cancelled');  
          setTimeout(() => router.push('/user/home'), 2000);  
          return;  
        }  
  
        if (!code || !stateParam) {  
          setError('Missing code or state from Google');  
          setTimeout(() => router.push('/user/home'), 2000);  
          return;  
        }  
  
        let mode = 'login';  
        try {  
          const decoded = JSON.parse(atob(stateParam));  
          mode = decoded.mode || 'login';  
        } catch (e) {  
          console.warn('Invalid state format, using default login');  
        }  
  
        console.log(`Processing Google ${mode}...`);  
  
        setStatus(`Authenticating with Google (${mode})...`);  
  
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';  
  
        const response = await fetch(`${API_BASE_URL}/api/auth/google/callback`, {  
          method: 'POST',  
          headers: { 'Content-Type': 'application/json' },  
          body: JSON.stringify({ code, state: stateParam }),  
          credentials: 'include',  
        });  
  
        const data = await response.json();  
  
        if (!response.ok) {  
          throw new Error(data.message || 'Authentication failed');  
        }  
  
        if (data.requiresVerification) {  
          localStorage.setItem('pendingVerificationEmail', data.email);
          setStatus('Verification email sent! Check your inbox.');  
          sessionStorage.setItem('pendingVerificationEmail', data.email);  
          sessionStorage.setItem('pendingGoogleAuth', 'true');  
          setTimeout(() => router.push('/user/home?verify=true'), 1500);  
          return; // HINDI MAG-LOGIN  
        }  
  
        setStatus('Login successful! Redirecting...');  
        localStorage.setItem('token', data.token);  
        localStorage.setItem('isAdmin', 'false');  
        localStorage.setItem('userType', 'user');  
        localStorage.setItem('userId', data.user.userId);  
        localStorage.setItem('userEmail', data.user.email);  
        localStorage.setItem('googleAuth', 'true');  
        sessionStorage.setItem('userJustLoggedIn', 'true');  
        setTimeout(() => router.push('/user/home'), 1000);  
  
      } catch (error) {  
        console.error('Callback error:', error);  
        setError(error.message || 'Authentication failed');  
        setTimeout(() => router.push('/user/home'), 3000);  
      }  
    };  
  
    handleCallback();  
  }, [searchParams, router]); 

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
      color: 'white'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        {error ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
            <h2 style={{ color: '#d32f2f', marginBottom: '10px' }}>Authentication Error</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>{error}</p>
            <button
              onClick={() => router.push('/user/home')}
              style={{
                background: '#2E7D32',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Go Home
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>
              <div style={{
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #2E7D32',
                borderRadius: '50%',
                width: '60px',
                height: '60px',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }}></div>
            </div>
            <h2 style={{ color: '#333', marginBottom: '10px' }}>Google Sign-In</h2>
            <p style={{ color: '#666' }}>{status}</p>
          </>
        )}
      </div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}