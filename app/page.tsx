'use client';

import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { useEffect, useRef, useState } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, db } from '../src/lib/firebase';

type RecordType = {
  id: string;
  lat: number;
  lng: number;
  fishType: string;
  size: string;
  weight: string;
  depth: string;
  rig: string;
  comment: string;
  date: string;
  userId: string;
};

const emptyForm = {
  fishType: '',
  size: '',
  weight: '',
  depth: '',
  rig: '',
  comment: '',
  date: '',
};

const mapStyle = {
  width: '100%',
  height: '100dvh',
};
const PolicyModal = ({ title, content, onClose }: any) => (
  <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
    <div className="bg-white w-[90%] max-w-md rounded-xl shadow-xl max-h-[80vh] flex flex-col">

      <div className="p-4 border-b flex justify-between">
        <h2 className="font-bold text-lg text-gray-900">{title}</h2>
        <button onClick={onClose}>✕</button>
      </div>

      <div className="p-4 overflow-y-auto text-sm text-gray-700 whitespace-pre-line leading-relaxed">
        {content}
      </div>

    </div>
  </div>
);
export default function Home() {
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<RecordType[]>([]);

  const [mode, setMode] = useState<'new' | 'edit' | null>(null);

  const [selected, setSelected] = useState<RecordType | null>(null);

  const [pos, setPos] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const [mapCenter, setMapCenter] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('map-center');

      if (saved) {
        return JSON.parse(saved);
      }
    }

    return {
      lat: 35.6,
      lng: 139.6,
    };
  });

  const [zoom, setZoom] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('map-zoom');

      if (saved) {
        return Number(saved);
      }
    }

    return 9;
  });
  const termsText = `
本アプリは釣果記録および位置情報の保存を目的としたサービスです。

・ユーザーは自身の責任において本サービスを利用するものとします
・不正な用途での利用は禁止します
・本サービスの内容の正確性は保証されません
・本サービス利用による損害について一切責任を負いません

本規約は予告なく変更される場合があります。
`;

const privacyText = `
本アプリでは以下の情報を取得します：

・Googleアカウント情報（ログインのため）
・位置情報（釣果記録のため）
・入力された釣果データ

これらはサービス提供の目的のみに利用され、
第三者に提供することはありません。

お問い合わせ：kakoibi.official@gmail.com
`;
  const mapRef = useRef<google.maps.Map | null>(null);

  /* ===== Auth ===== */

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();

    const res = await signInWithPopup(auth, provider);

    setUser(res.user);
  };

  const logout = async () => {
    await signOut(auth);

    setUser(null);
  };

  /* ===== データ取得 ===== */

  const fetchRecords = async () => {
  if (!user) return;

  const q = query(
    collection(db, 'records'),
    where('userId', '==', user.uid)
  );

  const snap = await getDocs(q);
  let data: any[] = [];

  snap.forEach((d) => data.push({ id: d.id, ...d.data() }));

  const now = new Date();

  if (filter === 'today') {
    data = data.filter((r) =>
      r.date && new Date(r.date).toDateString() === now.toDateString()
    );
  }

  if (filter === 'week') {
    data = data.filter((r) =>
      r.date && now.getTime() - new Date(r.date).getTime() < 7 * 86400000
    );
  }

  setRecords(data);
};

  useEffect(() => {
  fetchRecords();
}, [user, filter]);
  useEffect(() => {
  if (mode) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'auto';
  }

  return () => {
    document.body.style.overflow = 'auto';
  };
}, [mode]);

  /* ===== Map Click ===== */

  const handleMapClick = (e: any) => {
    if (!e.latLng) return;

    if (mode) return;

    setMode('new');

    setPos({
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    });

    setForm(emptyForm);
  };

  /* ===== 保存 ===== */

  const save = async () => {
    if (!user) return;

    try {
      if (mode === 'new' && pos) {
        await addDoc(collection(db, 'records'), {
          ...form,
          lat: pos.lat,
          lng: pos.lng,
          userId: user.uid,
        });
      }

      if (mode === 'edit' && selected) {
        const ref = doc(db, 'records', selected.id);

        await updateDoc(ref, {
          fishType: form.fishType,
          size: form.size,
          weight: form.weight,
          depth: form.depth,
          rig: form.rig,
          comment: form.comment,
          date: form.date,
        });
      }

      await fetchRecords();
    } catch (e) {
      console.error(e);
    }

    reset();
  };

  /* ===== 削除 ===== */

  const remove = async () => {
    if (!selected) return;

    await deleteDoc(doc(db, 'records', selected.id));

    await fetchRecords();

    setSelected(null);
  };

  /* ===== 編集開始 ===== */

  const startEdit = () => {
    if (!selected) return;

    setMode('edit');

    setForm({
      fishType: selected.fishType || '',
      size: selected.size || '',
      weight: selected.weight || '',
      depth: selected.depth || '',
      rig: selected.rig || '',
      comment: selected.comment || '',
      date: selected.date || '',
    });
  };

  const reset = () => {
    setMode(null);
    setPos(null);
    setSelected(null);
    setForm(emptyForm);
  };

  /* ===== Loading ===== */

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="text-slate-700 text-lg font-semibold">
          Loading...
        </div>
      </div>
    );
  }

  /* ===== Login ===== */

if (!user) {
  return (
    <>
    <div
      className="
      relative
      h-screen
      overflow-hidden
      flex
      flex-col
      justify-between
      "
      style={{
        backgroundImage: "url('/images/login-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-blue-900/10 to-blue-950/30" />

      {/* ===== Top ===== */}
      <div className="relative z-10 pt-28 px-8 text-center">
        {/* logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/images/logo-white.png"
            alt="logo"
            className="w-55 h-55 object-contain drop-shadow-2xl"
          />
        </div>

      </div>

      {/* ===== Bottom Sheet ===== */}
      <div
        className="
        relative
        z-10
        bg-white/92
        rounded-t-[36px]
        pt-7 pb-10 px-6
        shadow-2xl
        "
      >
        {/* Google Login */}
        <button
          onClick={login}
          className="
          h-16
          w-full
          rounded-2xl
          bg-gradient-to-r
          from-blue-500
          to-blue-600
          shadow-xl
          flex
          items-center
          justify-center
          gap-3
          text-white
          text-xl
          font-bold
          transition
cursor-pointer
select-none
          "
        >
  <div className="bg-white rounded-full p-2">
    <img
      src="/images/google-logo.svg"
      alt="google"
      className="w-5 h-5"
    />
  </div>

  Googleでログイン
</button>

        {/* features */}
        <div className="grid grid-cols-3 gap-2 mt-6">
          <div className="text-center">
            <div className="text-lg mb-3">📍</div>

            <h3 className="font-bold text-slate-800 text-lg">
              釣り場を探す
            </h3>

            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              地図から
              <br />
              ポイント検索
            </p>
          </div>

          <div className="text-center">
            <div className="text-lg mb-3">🐟</div>

            <h3 className="font-bold text-slate-800 text-lg">
              釣果を記録
            </h3>

            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              サイズや
              <br />
              場所を保存
            </p>
          </div>

          <div className="text-center">
            <div className="text-lg mb-3">📊</div>

            <h3 className="font-bold text-slate-800 text-lg">
              情報共有
            </h3>

            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              釣果や
              <br />
              ポイント共有
            </p>
          </div>
        </div>

        {/* footer */}
        <p
          className="
          text-center
          text-slate-500
          text-sm
          leading-relaxed
          mt-10
          "
        >
          ログインすることで、
          <span className="text-blue-600 font-semibold"
          onClick={() => setShowTerms(true)}>
            利用規約
          </span>
          と
          <span className="text-blue-600 font-semibold"
          onClick={() => setShowPrivacy(true)}>
            プライバシーポリシー
          </span>
          に
          <br />
          同意したものとみなされます。
        </p>
      </div>
      
    </div>
    
{showTerms && (
        <PolicyModal
          title="利用規約"
          content={termsText}
          onClose={() => setShowTerms(false)}
        />
      )}

      {showPrivacy && (
        <PolicyModal
          title="プライバシーポリシー"
          content={privacyText}
          onClose={() => setShowPrivacy(false)}
        />
      )}
    </>
  );
}



  return (
    <div className="relative h-screen overflow-visible bg-black">
      {/* ===== Header ===== */}

      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-4">
  <div className="rounded-2xl backdrop-blur shadow-lg px-4 py-3 flex items-center justify-between">

    {/* 左 */}
    <div>
      <div className="flex items-center gap-2">
        <span>🎣</span>
        <h1 className="font-bold text-slate-800 text-lg">Fishing Log</h1>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        釣果 {records.length} 件
      </p>
    </div>

    {/* 中央 */}
    <select
      value={filter}
      onChange={(e) => setFilter(e.target.value as any)}
      className="bg-gray-100 px-2 py-1 rounded text-sm text-slate-500"
    >
      <option value="all">全期間</option>
      <option value="today">今日</option>
      <option value="week">7日間</option>
    </select>

    {/* 右（サイズ小さく） */}
    <button
      onClick={logout}
      className="bg-red-500 text-white px-2 py-1 rounded-lg text-xs"
    >
      ログアウト
    </button>

  </div>
</div>


      {/* ===== Google Map ===== */}
    {!mode && (
  <div className="relative z-0 touch-pan-x touch-pan-y">
      <LoadScript
        googleMapsApiKey={
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!
        }
      >
        <GoogleMap
  mapContainerStyle={mapStyle}
  center={mapCenter}
  zoom={zoom}
  onLoad={(map) => {
    mapRef.current = map;
  }}
  onClick={handleMapClick}
  onIdle={() => {
    if (!mapRef.current) return;

    const center = mapRef.current.getCenter();

    if (!center) return;

    const newCenter = {
      lat: center.lat(),
      lng: center.lng(),
    };

    const newZoom = mapRef.current.getZoom() || 9;

    setMapCenter(newCenter);
    setZoom(newZoom);

    localStorage.setItem(
      'map-center',
      JSON.stringify(newCenter)
    );

    localStorage.setItem(
      'map-zoom',
      String(newZoom)
    );
  }}
  options={{
    disableDefaultUI: true,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    gestureHandling: 'greedy',
    minZoom: 3,
    styles: [
      {
        featureType: 'poi',
        stylers: [{ visibility: 'off' }],
      },
    ],
  }}
>


          {records.map((r) => (
  <Marker
    key={r.id + r.date}
    position={{
      lat: r.lat,
      lng: r.lng,
    }}
    onClick={() => setSelected(r)}
    icon={{
      url:
        'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    }}
  />
))}
        </GoogleMap>
      </LoadScript>
      <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-white/90 text-gray-700 px-3 py-1.5 rounded-full text-xs shadow">
  📍 タップでピン追加
</div>
      </div>
      )}

      {/* ===== Selected Card ===== */}

      {selected && (
        <div className="absolute bottom-6 left-4 right-4 z-30">
          <div className="
          rounded-[32px]
          bg-white/95
          shadow-2xl
          border
          border-white/40
          p-5
          ">
            <div className="flex items-start justify-between">
              <div>
                <div className="
                inline-flex
                bg-blue-100
                text-blue-700
                px-3
                py-1
                rounded-full
                text-xs
                font-bold
                mb-3
                ">
                  {selected.fishType || '魚種未設定'}
                </div>

                <h2 className="text-3xl font-black text-slate-800">
                  {selected.size || '--'}
                </h2>

                <p className="text-slate-500 text-sm mt-1">
                  {selected.date || '日時未設定'}
                </p>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="
                text-slate-400
                text-lg
                hover:text-slate-600
                transition
cursor-pointer
select-none
                "
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="bg-slate-100 rounded-2xl p-3">
                <p className="text-xs text-slate-400">
                  重量
                </p>

                <p className="font-bold text-slate-700 mt-1">
                  {selected.weight || '--'}
                </p>
              </div>

              <div className="bg-slate-100 rounded-2xl p-3">
                <p className="text-xs text-slate-400">
                  水深
                </p>

                <p className="font-bold text-slate-700 mt-1">
                  {selected.depth || '--'}
                </p>
              </div>

              <div className="bg-slate-100 rounded-2xl p-3">
                <p className="text-xs text-slate-400">
                  仕掛け
                </p>

                <p className="font-bold text-slate-700 mt-1 truncate">
                  {selected.rig || '--'}
                </p>
              </div>
            </div>

            {selected.comment && (
              <div className="
              mt-4
              bg-slate-50
              rounded-2xl
              p-4
              text-sm
              text-slate-700
              leading-relaxed
              ">
                {selected.comment}
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={startEdit}
                className="
                flex-1
                bg-blue-600
                hover:bg-blue-700
                transition
                text-white
                py-3
                rounded-2xl
                font-bold
cursor-pointer
select-none
                "
              >
                編集
              </button>

              <button
                onClick={remove}
                className="
                flex-1
                bg-red-500
                hover:bg-red-600
                transition
                text-white
                py-3
                rounded-2xl
                font-bold
cursor-pointer
select-none
                "
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal ===== */}

      {(mode === 'new' || mode === 'edit') && (
  <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
       onTouchStart={(e) => e.stopPropagation()}
       onClick={(e) => e.stopPropagation()}
  >

    <div
      className="bg-white w-full sm:max-w-lg rounded-t-[36px] sm:rounded-[36px] shadow-2xl flex flex-col max-h-[90dvh]"
      onClick={(e) => e.stopPropagation()}
    >

      {/* ヘッダー */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl text-slate-800 font-bold">🎣 釣果記録</h2>
          <button onClick={reset} className="text-xl px-2">✕</button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          ※ タップで操作できます
        </p>
      </div>

      {/* スクロール部分 */}
      <div className="overflow-y-auto px-6 pb-4 space-y-4">

  {/* 魚種（メイン） */}
  <div>
    <p className="text-xs text-gray-800 mb-1">魚種</p>
    <input
      className="w-full border-2 border-blue-300 p-4 rounded-xl text-base text-slate-500"
      placeholder="例：シーバス"
      value={form.fishType}
      onChange={(e) =>
        setForm({ ...form, fishType: e.target.value })
      }
    />
  </div>

  {/* 日付 */}
  <div>
    <p className="text-xs text-gray-800 mb-1">日時</p>
    <input
      type="datetime-local"
      className="w-full border p-3 rounded-xl text-sm text-slate-500"
      placeholder="日時"
      value={form.date}
      onChange={(e) =>
        setForm({ ...form, date: e.target.value })
      }
    />
  </div>

  {/* サイズ系 */}
  <div>
    <p className="text-xs text-gray-800 mb-1">サイズ / 重量 / 水深</p>
    <div className="grid grid-cols-3 gap-2">
      <input
        className="border p-3 rounded-xl text-sm text-slate-500"
        placeholder="サイズ"
        value={form.size}
        onChange={(e) =>
          setForm({ ...form, size: e.target.value })
        }
      />

      <input
        className="border p-3 rounded-xl text-sm text-slate-500"
        placeholder="重量"
        value={form.weight}
        onChange={(e) =>
          setForm({ ...form, weight: e.target.value })
        }
      />

      <input
        className="border p-3 rounded-xl text-sm text-slate-500"
        placeholder="水深"
        value={form.depth}
        onChange={(e) =>
          setForm({ ...form, depth: e.target.value })
        }
      />
    </div>
  </div>

  {/* 仕掛け */}
  <div>
    <p className="text-xs text-gray-800 mb-1">仕掛け</p>
    <input
      className="w-full border p-3 rounded-xl text-sm text-slate-500"
      placeholder="ルアー / エサなど"
      value={form.rig}
      onChange={(e) =>
        setForm({ ...form, rig: e.target.value })
      }
    />
  </div>

  {/* コメント */}
  <div>
    <p className="text-xs text-gray-800 mb-1">コメント</p>
    <textarea
      className="w-full border p-3 rounded-xl min-h-[120px] text-sm text-slate-500"
      placeholder="メモや状況など"
      value={form.comment}
      onChange={(e) =>
        setForm({ ...form, comment: e.target.value })
      }
    />
  </div>

</div>

      {/* フッター */}
      <div className="flex gap-2 p-4 border-t">
        <button
          onClick={reset}
          className="flex-1 bg-gray-500 py-3 rounded"
        >
          キャンセル
        </button>

        <button
          onClick={save}
          className="flex-1 bg-blue-600 text-white py-3 rounded"
        >
          保存
        </button>
      </div>

    </div>
  </div>
)}
    </div>
  );
  
}