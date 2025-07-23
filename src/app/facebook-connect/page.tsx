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
        appId: '1471736117322956', // 🔁 Replace with your App ID
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
        if (response.authResponse && response.authResponse.accessToken) {
          const accessToken = response.authResponse.accessToken;
          console.log('✅ User token:', accessToken);
          fetchPages(accessToken);
        } else {
          console.warn('❌ Login failed or cancelled');
        }
      },
      {
        scope:
          'pages_show_list,pages_read_engagement,,pages_manage_posts',
      }
    );
  };

  const fetchPages = (userToken: string) => {
    window.FB.api('/me/accounts', (response: PagesResponse) => {
      console.log('📄 Pages:', response);
      if (response.data?.length > 0) {
        const page = response.data[0];
        alert(`📘 Page: ${page.name}\n🔑 Page Token: ${page.access_token}`);
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
