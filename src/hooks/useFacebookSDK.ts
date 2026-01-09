'use client';

import { useEffect, useCallback, useState } from 'react';
import Cookies from 'js-cookie';
import { FB_APP_ID } from '@/types/accounts';

// Global type augmentation for Facebook SDK
declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: {
      init: (params: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options: { scope: string }
      ) => void;
    };
  }
}

interface FacebookLoginResponse {
  authResponse?: {
    accessToken: string;
    expiresIn: number;
    signedRequest: string;
    userID: string;
  };
  status: string;
}

interface UseFacebookSDKReturn {
  login: (onSuccess: (accessToken: string) => void, onCancel: () => void) => void;
  isLoading: boolean;
}

const FB_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'pages_manage_engagement',
  'pages_read_user_content',
  'instagram_basic',
  'instagram_content_publish',
  'business_management',
].join(',');

export function useFacebookSDK(): UseFacebookSDKReturn {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize Facebook SDK
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: FB_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v19.0',
      });
    };

    // Load the SDK script if not already loaded
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  const login = useCallback(
    (onSuccess: (accessToken: string) => void, onCancel: () => void) => {
      if (!window.FB) {
        console.error('Facebook SDK not loaded');
        onCancel();
        return;
      }

      setIsLoading(true);

      window.FB.login(
        (response: FacebookLoginResponse) => {
          setIsLoading(false);
          if (response.authResponse?.accessToken) {
            onSuccess(response.authResponse.accessToken);
          } else {
            onCancel();
          }
        },
        { scope: FB_SCOPES }
      );
    },
    []
  );

  return { login, isLoading };
}

// Helper for Twitter OAuth flow
export async function initiateTwitterAuth(): Promise<void> {
  const response = await fetch('/api/twitter-v1.1/auth', {
    credentials: 'include',
  });

  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to initiate Twitter auth');
  }

  // Store OAuth secret and JWT for callback
  Cookies.set('twitter_oauth_secret', data.oauthTokenSecret, { expires: 5 / 1440 });
  Cookies.set('temp_jwt', Cookies.get('jwt') || '', { expires: 5 / 1440 });

  // Redirect to Twitter
  window.location.href = data.authUrl;
}
