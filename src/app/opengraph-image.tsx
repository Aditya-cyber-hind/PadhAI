import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PadhAI — Turn any document into a study workspace';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#fafaf9',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top: brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: '-0.03em',
            }}
          >
            P
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#1c1917',
              letterSpacing: '-0.02em',
            }}
          >
            PadhAI
          </div>
        </div>

        {/* Middle: headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              color: '#1c1917',
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              maxWidth: 1000,
            }}
          >
            Turn any document into a study workspace.
          </div>
          <div
            style={{
              fontSize: 28,
              color: '#78716c',
              lineHeight: 1.4,
              maxWidth: 900,
            }}
          >
            Chat with your sources · Quizzes · Flashcards · Brain maps
          </div>
        </div>

        {/* Bottom: footer strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 22,
            color: '#78716c',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                background: '#fef3c7',
                color: '#b45309',
                padding: '6px 16px',
                borderRadius: 999,
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              Free · Open source
            </span>
          </div>
          <div style={{ fontSize: 22, color: '#1c1917', fontWeight: 600 }}>
            padh-aiaditya.vercel.app
          </div>
        </div>

        {/* Amber accent line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 8,
            background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%)',
          }}
        />
      </div>
    ),
    { ...size }
  );
}