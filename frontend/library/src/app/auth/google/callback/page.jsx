"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// API Base URL - automatically detects environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

function GoogleCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing...');
  const [error, setError] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [email, setEmail] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    setVerificationError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      // Store tokens and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('isAdmin', 'false');
      localStorage.setItem('userType', 'user');
      localStorage.setItem('userId', data.user.userId);
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('googleAuth', 'true');

      sessionStorage.setItem('newUserSignup', 'true');
      sessionStorage.removeItem('pendingVerificationEmail');
      sessionStorage.removeItem('pendingGoogleAuth');

      setStatus('✅ Verification successful! Redirecting...');
      setTimeout(() => router.push('/user/get-started'), 1000);

    } catch (error) {
      console.error('Verification error:', error);
      setVerificationError(error.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend code');
      }

      setVerificationError('');
      alert('✅ New verification code sent! Check your email.');
    } catch (error) {
      setVerificationError(error.message || 'Failed to resend code');
    }
  };

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

        const response = await fetch(`${API_BASE_URL}/auth/google/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state: stateParam }),
          credentials: 'include',
        });

        const data = await response.json();

        // Handle 403 - Verification Required (could be error response)
        if (response.status === 403 || data.requiresVerification) {
          // Show verification modal directly on this page
          setEmail(data.email);
          setStatus('📧 Verification code sent to your email!');
          setShowVerificationModal(true);
          return;
        }

        // Handle 404 - No account found (gracefully, no console error)
        if (response.status === 404) {
          setError(data.message || 'No account found. Please sign up first.');
          return; // Don't throw error, just show message
        }

        if (!response.ok) {
          throw new Error(data.message || 'Authentication failed');
        }

        setStatus('Login successful! Redirecting...');
        console.log('💾 Saving user data to localStorage:', data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('isAdmin', 'false');
        localStorage.setItem('userType', 'user');
        localStorage.setItem('userId', data.user.userId);
        localStorage.setItem('userEmail', data.user.email);
        localStorage.setItem('googleAuth', 'true');
        if (data.user.firstName) localStorage.setItem('userFirstName', data.user.firstName);
        if (data.user.lastName) localStorage.setItem('userLastName', data.user.lastName);
        sessionStorage.setItem('userJustLoggedIn', 'true');
        console.log('✅ User data saved, redirecting to home...');
        setTimeout(() => router.push('/user/home'), 1000);

      } catch (error) {
        // Only log errors that aren't handled gracefully above
        if (error.message !== 'No account found. Please sign up first.') {
          console.error('Callback error:', error);
        }
        setError(error.message || 'Authentication failed');
        // Don't auto-redirect for graceful errors
        if (error.message !== 'No account found. Please sign up first.') {
          setTimeout(() => router.push('/user/home'), 3000);
        }
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
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
      color: 'white',
      padding: '20px'
    }}>
      {/* Verification Modal */}
      {showVerificationModal && (
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          textAlign: 'center',
          maxWidth: '450px',
          width: '100%'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📧</div>
          <h2 style={{ color: '#2E7D32', marginBottom: '10px', fontSize: '24px' }}>Verify Your Email</h2>
          <p style={{ color: '#666', marginBottom: '10px', fontSize: '14px' }}>
            We sent a 6-digit code to:
          </p>
          <p style={{ color: '#333', fontWeight: 'bold', marginBottom: '20px' }}>{email}</p>

          {verificationError && (
            <div style={{
              background: '#ffebee',
              color: '#c62828',
              padding: '10px',
              borderRadius: '8px',
              marginBottom: '15px',
              fontSize: '14px'
            }}>
              {verificationError}
            </div>
          )}

          <form onSubmit={handleVerifySubmit}>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={6}
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '20px',
                textAlign: 'center',
                border: '2px solid #ddd',
                borderRadius: '8px',
                marginBottom: '15px',
                letterSpacing: '5px',
                fontWeight: 'bold'
              }}
              required
              disabled={isVerifying}
            />

            <button
              type="submit"
              disabled={isVerifying || verificationCode.length !== 6}
              style={{
                width: '100%',
                background: isVerifying || verificationCode.length !== 6 ? '#ccc' : '#2E7D32',
                color: 'white',
                border: 'none',
                padding: '15px',
                borderRadius: '8px',
                cursor: isVerifying || verificationCode.length !== 6 ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                marginBottom: '15px'
              }}
            >
              {isVerifying ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <p style={{ color: '#666', fontSize: '14px' }}>
            Didn't receive the code?{' '}
            <button
              onClick={handleResendCode}
              style={{
                background: 'none',
                border: 'none',
                color: '#2E7D32',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Resend
            </button>
          </p>
        </div>
      )}

      {/* Loading/Error Screen */}
      {!showVerificationModal && (
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
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ✅ Wrap with Suspense directly in the same file
export default function GoogleCallback() {
  return (
    <Suspense fallback={<div>Loading Google callback...</div>}>
      <GoogleCallbackInner />
    </Suspense>
  );
}
