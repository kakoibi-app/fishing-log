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
  height: '100vh',
};

export default function Home() {
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

    const data: any[] = [];

    snap.forEach((d) => {
      data.push({
        id: d.id,
        ...d.data(),
      });
    });

    setRecords(data);
  };

  useEffect(() => {
    fetchRecords();
  }, [user]);

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
            className="w-35 h-35 object-contain drop-shadow-2xl"
          />
        </div>

      </div>

      {/* ===== Bottom Sheet ===== */}
      <div
        className="
        relative
        z-10
        bg-white/92
        backdrop-blur-2xl
        rounded-t-[48px]
        px-7
        pt-8
        pb-10
        shadow-2xl
        "
      >
        {/* Google Login */}
        <button
          onClick={login}
          className="
          w-full
          h-20
          rounded-[28px]
          bg-gradient-to-r
          from-blue-500
          to-blue-600
          text-white
          text-2xl
          font-bold
          shadow-2xl
          active:scale-[0.98]
          transition
          flex
          items-center
          justify-center
          gap-4
          "
        >
          <div
            className="
            h-12
            w-12
            rounded-full
            bg-white
            flex
            items-center
            justify-center
            text-2xl
            "
          >
            G
          </div>

          Googleでログイン
        </button>

        {/* features */}
        <div className="grid grid-cols-3 gap-4 mt-10">
          <div className="text-center">
            <div className="text-2xl mb-3">📍</div>

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
            <div className="text-2xl mb-3">🐟</div>

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
            <div className="text-2xl mb-3">📊</div>

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
          <span className="text-blue-600 font-semibold">
            利用規約
          </span>
          と
          <span className="text-blue-600 font-semibold">
            プライバシーポリシー
          </span>
          に
          <br />
          同意したものとみなされます。
        </p>
      </div>
    </div>
  );
}

  return (
    <div className="relative h-screen overflow-hidden bg-black">
      {/* ===== Header ===== */}

      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-safe pt-4">
        <div className="
        rounded-3xl
        bg-white/90
        backdrop-blur-xl
        shadow-2xl
        border
        border-white/40
        px-5
        py-4
        flex
        items-center
        justify-between
        ">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎣</span>

              <h1 className="font-black text-slate-800 text-xl">
                Fishing Log
              </h1>
            </div>

            <p className="text-xs text-slate-500 mt-1">
              釣果 {records.length} 件
            </p>
          </div>

          <button
            onClick={logout}
            className="
            bg-red-500
            hover:bg-red-600
            active:scale-95
            transition
            text-white
            px-4
            py-2
            rounded-2xl
            text-sm
            font-bold
            shadow-lg
            "
          >
            ログアウト
          </button>
        </div>
      </div>

      {/* ===== Google Map ===== */}

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
              key={r.id}
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

      {/* ===== Floating Add Button ===== */}

      <button
        onClick={() => {
          setMode('new');

          setPos(mapCenter);

          setForm(emptyForm);
        }}
        className="
        absolute
        bottom-28
        right-6
        z-20
        h-20
        w-20
        rounded-full
        bg-blue-600
        hover:bg-blue-700
        active:scale-95
        transition
        text-white
        shadow-2xl
        flex
        flex-col
        items-center
        justify-center
        "
      >
        <span className="text-3xl leading-none">＋</span>

        <span className="text-xs font-bold">
          記録
        </span>
      </button>

      {/* ===== Selected Card ===== */}

      {selected && (
        <div className="absolute bottom-6 left-4 right-4 z-30">
          <div className="
          rounded-[32px]
          bg-white/95
          backdrop-blur-xl
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
                text-2xl
                hover:text-slate-600
                transition
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
                active:scale-[0.98]
                transition
                text-white
                py-3
                rounded-2xl
                font-bold
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
                active:scale-[0.98]
                transition
                text-white
                py-3
                rounded-2xl
                font-bold
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
        <div className="
        fixed
        inset-0
        z-40
        bg-black/40
        backdrop-blur-sm
        flex
        items-end
        sm:items-center
        justify-center
        ">
          <div className="
          bg-white
          w-full
          sm:max-w-lg
          rounded-t-[36px]
          sm:rounded-[36px]
          p-6
          shadow-2xl
          max-h-[90vh]
          overflow-y-auto
          ">
            <div className="
            w-16
            h-1.5
            bg-slate-200
            rounded-full
            mx-auto
            mb-5
            sm:hidden
            " />

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-black text-slate-800">
                  🎣 釣果記録
                </h2>

                <p className="text-slate-500 mt-2">
                  釣れた魚の情報を記録します
                </p>
              </div>

              <button
                onClick={reset}
                className="text-slate-400 text-3xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <input
                className="
                w-full
                bg-white
                border
                border-slate-300
                text-slate-800
                placeholder:text-slate-400
                rounded-2xl
                px-4
                py-4
                outline-none
                focus:ring-4
                focus:ring-blue-200
                focus:border-blue-500
                "
                placeholder="魚種"
                value={form.fishType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    fishType: e.target.value,
                  })
                }
              />

              <input
                type="datetime-local"
                className="
                w-full
                bg-white
                border
                border-slate-300
                text-slate-800
                rounded-2xl
                px-4
                py-4
                outline-none
                focus:ring-4
                focus:ring-blue-200
                focus:border-blue-500
                "
                value={form.date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    date: e.target.value,
                  })
                }
              />

              <div className="grid grid-cols-3 gap-3">
                <input
                  className="
                  bg-white
                  border
                  border-slate-300
                  text-slate-800
                  placeholder:text-slate-400
                  rounded-2xl
                  px-4
                  py-4
                  outline-none
                  focus:ring-4
                  focus:ring-blue-200
                  focus:border-blue-500
                  "
                  placeholder="サイズ"
                  value={form.size}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      size: e.target.value,
                    })
                  }
                />

                <input
                  className="
                  bg-white
                  border
                  border-slate-300
                  text-slate-800
                  placeholder:text-slate-400
                  rounded-2xl
                  px-4
                  py-4
                  outline-none
                  focus:ring-4
                  focus:ring-blue-200
                  focus:border-blue-500
                  "
                  placeholder="重量"
                  value={form.weight}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      weight: e.target.value,
                    })
                  }
                />

                <input
                  className="
                  bg-white
                  border
                  border-slate-300
                  text-slate-800
                  placeholder:text-slate-400
                  rounded-2xl
                  px-4
                  py-4
                  outline-none
                  focus:ring-4
                  focus:ring-blue-200
                  focus:border-blue-500
                  "
                  placeholder="水深"
                  value={form.depth}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      depth: e.target.value,
                    })
                  }
                />
              </div>

              <input
                className="
                w-full
                bg-white
                border
                border-slate-300
                text-slate-800
                placeholder:text-slate-400
                rounded-2xl
                px-4
                py-4
                outline-none
                focus:ring-4
                focus:ring-blue-200
                focus:border-blue-500
                "
                placeholder="仕掛け"
                value={form.rig}
                onChange={(e) =>
                  setForm({
                    ...form,
                    rig: e.target.value,
                  })
                }
              />

              <textarea
                className="
                w-full
                min-h-[120px]
                bg-white
                border
                border-slate-300
                text-slate-800
                placeholder:text-slate-400
                rounded-2xl
                px-4
                py-4
                outline-none
                focus:ring-4
                focus:ring-blue-200
                focus:border-blue-500
                "
                placeholder="コメント"
                value={form.comment}
                onChange={(e) =>
                  setForm({
                    ...form,
                    comment: e.target.value,
                  })
                }
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={reset}
                className="
                flex-1
                bg-slate-200
                hover:bg-slate-300
                transition
                text-slate-700
                py-4
                rounded-2xl
                font-bold
                "
              >
                キャンセル
              </button>

              <button
                onClick={save}
                className="
                flex-1
                bg-blue-600
                hover:bg-blue-700
                active:scale-[0.98]
                transition
                text-white
                py-4
                rounded-2xl
                font-bold
                shadow-xl
                "
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