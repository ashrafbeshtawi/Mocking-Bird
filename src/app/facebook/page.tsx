'use client';

import { useEffect } from 'react';

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
  useEffect(() => {
    // Load Facebook SDK
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: '1471736117322956', // Replace with your actual App ID
        cookie: true,
        xfbml: true,
        version: 'v19.0',
      });
    };

    // Inject SDK script
    if (!document.getElementById('facebook-jssdk')) {
      const js = document.createElement('script');
      js.id = 'facebook-jssdk';
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      document.body.appendChild(js);
    }
  }, []);

  const handleLogin = () => {
    window.FB.login(
      (response: facebook.StatusResponse) => {
        if (response.authResponse?.accessToken) {
          fetchPages();
        } else {
          console.warn('❌ Login failed or cancelled');
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
      console.log('📄 Pages:', response);

      if (response.data?.length > 0) {
        const page = response.data[0];
        alert(`📘 Page: ${page.name}\n🔑 Page Token: ${page.access_token}`);

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
            console.log('✅ Token saved to database');
          } else {
            console.error('❌ Failed to save token:', await res.json());
          }
        } catch (err) {
          console.error('❌ Network error while saving token:', err);
        }
      } else {
        alert('❌ No pages found or missing permissions.');
      }
    });
  };

  return (
    <main style={{ padding: 20 }}>
      <h1>🔐 Facebook Page Access Token Generator</h1>
      <button
        onClick={handleLogin}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          background: '#1877f2',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        Login with Facebook
      </button>
    </main>
  );
}
