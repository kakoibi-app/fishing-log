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
        <section className="mt-10 max-w-xl mx-auto text-left space-y-6">

        <div>
          <h2 className="text-lg font-bold mb-2">サービス概要</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            釣りログは、釣果や釣り場を地図上で記録・管理できるサービスです。
            どこで何が釣れたかを簡単に振り返ることができ、
            自分だけの釣りデータを蓄積できます。
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">主な機能</h2>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>・地図から釣り場を視覚的に確認</li>
            <li>・魚種やサイズなどの釣果記録</li>
            <li>・グループでの情報共有機能</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">こんな人におすすめ</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            釣りの記録を残したい方や、自分の釣りパターンを分析したい方、
            仲間と釣り情報を共有したい方におすすめです。
          </p>
        </div>

      </section>
      <div className="mt-8 flex justify-center">
        <img
          src="/images/app-preview.png"
          alt="釣りログの画面"
          className="rounded-xl shadow-lg w-full max-w-md"
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
