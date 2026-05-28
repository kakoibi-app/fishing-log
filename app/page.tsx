'use client';

import { useEffect } from 'react';

export default function Landing() {
  useEffect(() => {
    try {
      (window as any).adsbygoogle =
        (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch (e) {}
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-800">

      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold">
          🎣 釣りログ - Fishing Log
        </h1>
      </div>

      <div className="p-6">

        <p className="text-sm">
          釣果や釣り場を地図で記録できるサービスです。
        </p>

        <div className="my-8">
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-6308667358686884"
            data-ad-slot="XXXXXXXX"
            data-ad-format="auto"
          />
        </div>

        <div className="text-center mt-10">
          <a
            href="/app"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl"
          >
            アプリを使う
          </a>
        </div>

        <div className="text-xs mt-10 text-center space-x-4">
          <a href="/terms">利用規約</a>
          <a href="/privacy">プライバシーポリシー</a>
        </div>

      </div>
    </div>
  );
}
