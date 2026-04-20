import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: 'linear-gradient(135deg, #346a48, #244f33)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="110"
          height="110"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle cx="7" cy="7.5" r="2.8" fill="#fbf9f4" />
          <circle cx="8.2" cy="7" r="0.6" fill="#2d5f3f" />
          <path d="M9.5 6.5 L12 5.5 L10.5 7.5 Z" fill="#fbf9f4" />
          <path
            d="M6 10 C 7 14, 10 17.5, 18 17.5 L 20 14.5 L 16 13.5 L 17.5 10 L 13 11.5 Z"
            fill="#fbf9f4"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
