'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: typeof FB;
  }
}

interface Page {
  id: string;
  name: string;
  access_token: string;
}

interface PagesResponse {
  data: Page[];
  paging: {
    cursors: {
      before: string;
      after: string;
    };
  };
}

export default function FacebookLoginPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: '1471736117322956',
        cookie: true,
        xfbml: true,
        version: 'v19.0',
      });
    };

    if (!document.getElementById('facebook-jssdk')) {
      const js = document.createElement('script');
      js.id = 'facebook-jssdk';
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      document.body.appendChild(js);
    }
  }, []);

  const handleLogin = () => {
    setLoading(true);
    setMessage('');
    window.FB.login(
      (response: facebook.StatusResponse) => {
        if (response.authResponse?.accessToken) {
          fetchPages();
        } else {
          setLoading(false);
          setMessage('❌ Login failed or cancelled');
        }
      },
      {
        scope:
          'pages_show_list,pages_read_engagement,pages_manage_posts',
      }
    );
  };

  const fetchPages = () => {
    window.FB.api('/me/accounts', async (response: PagesResponse) => {
      if (response.data?.length > 0) {
        const page = response.data[0];

        try {
          const res = await fetch('/api/save-page', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pageId: page.id,
              accessToken: page.access_token,
            }),
          });

          if (res.ok) {
            setMessage(`✅ Token for "${page.name}" saved successfully.`);
          } else {
            setMessage('❌ Failed to save token');
          }
        } catch (err) {
          setMessage('❌ Network error while saving token');
        } finally {
          setLoading(false);
        }
      } else {
        setMessage('❌ No pages found or missing permissions.');
        setLoading(false);
      }
    });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 px-4">
      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold text-indigo-900">
          🔐 Facebook Page Access Token Generator
        </h1>
        <p className="text-sm text-indigo-700">
          Login with Facebook to save a Page Token you manage.
        </p>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition disabled:opacity-60"
        >
          {loading ? 'Logging in...' : 'Login with Facebook'}
        </button>

        {message && (
          <div
            className={`mt-2 text-sm ${
              message.startsWith('✅') ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {message}
          </div>
        )}

        <footer className="text-xs text-gray-500 mt-4">
          Your page tokens are saved securely.
        </footer>
      </div>
    </main>
  );
}
