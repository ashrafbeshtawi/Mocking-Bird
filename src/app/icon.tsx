import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: '#2d5f3f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Georgia, serif',
          fontSize: 18,
          fontWeight: 700,
          color: '#fbf9f4',
          letterSpacing: -1,
        }}
      >
        M
      </div>
    ),
    { ...size }
  );
}
