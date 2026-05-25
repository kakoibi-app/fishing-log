'use client';

import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { useEffect, useState } from 'react';
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
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);

  const [form, setForm] = useState(emptyForm);

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

    snap.forEach((d) => data.push({ id: d.id, ...d.data() }));

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
        const newData = {
          ...form,
          lat: pos.lat,
          lng: pos.lng,
          userId: user.uid,
        };

        await addDoc(collection(db, 'records'), newData);
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
      console.error('保存エラー', e);
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
      <div className="h-screen flex items-center justify-center bg-slate-100 text-slate-700">
        Loading...
      </div>
    );
  }

  /* ===== Login ===== */
  if (!user) {
    return (
      <div className="relative h-screen overflow-hidden bg-gradient-to-br from-sky-400 to-blue-700 flex items-center justify-center px-6">
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative z-10 w-full max-w-sm rounded-[32px] bg-white/90 backdrop-blur-xl p-8 shadow-2xl">
          <div className="text-center space-y-3 mb-8">
            <div className="text-5xl">🎣</div>

            <h1 className="text-3xl font-bold text-slate-800">
              釣りマップ
            </h1>

            <p className="text-slate-500 text-sm">
              釣果を記録して、自分だけのポイントマップを作ろう。
            </p>
          </div>

          <button
            onClick={login}
            className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 transition text-white py-4 font-semibold text-lg shadow-lg"
          >
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden">
      {/* ===== Header ===== */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-4">
        <div className="rounded-3xl bg-white/90 backdrop-blur-xl shadow-xl px-5 py-4 flex items-center justify-between border border-white/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎣</span>
              <h1 className="font-bold text-slate-800 text-xl">
                釣りマップ
              </h1>
            </div>

            <p className="text-xs text-slate-500 mt-1">
              釣果記録 {records.length} 件
            </p>
          </div>

          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 transition text-white px-4 py-2 rounded-2xl text-sm font-semibold"
          >
            ログアウト
          </button>
        </div>
      </div>

      {/* ===== Map ===== */}
      <LoadScript
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
      >
        <GoogleMap
          mapContainerStyle={mapStyle}
          center={{ lat: 35.6, lng: 139.6 }}
          zoom={9}
          onClick={handleMapClick}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
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
              position={{ lat: r.lat, lng: r.lng }}
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
          setPos({ lat: 35.6, lng: 139.6 });
        }}
        className="absolute bottom-28 right-6 z-20 h-20 w-20 rounded-full bg-blue-600 text-white shadow-2xl flex flex-col items-center justify-center hover:scale-105 transition"
      >
        <span className="text-3xl leading-none">＋</span>
        <span className="text-xs font-semibold">記録</span>
      </button>

      {/* ===== Bottom Card ===== */}
      {selected && (
        <div className="absolute bottom-6 left-4 right-4 z-30">
          <div className="rounded-[32px] bg-white/95 backdrop-blur-xl shadow-2xl p-5 border border-white/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
                    {selected.fishType || '魚種未設定'}
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-800">
                  {selected.size || '--'}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {selected.date || '日時未設定'}
                </p>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="text-slate-400 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="bg-slate-100 rounded-2xl p-3">
                <p className="text-xs text-slate-400">重量</p>
                <p className="font-semibold text-slate-700">
                  {selected.weight || '--'}
                </p>
              </div>

              <div className="bg-slate-100 rounded-2xl p-3">
                <p className="text-xs text-slate-400">水深</p>
                <p className="font-semibold text-slate-700">
                  {selected.depth || '--'}
                </p>
              </div>

              <div className="bg-slate-100 rounded-2xl p-3">
                <p className="text-xs text-slate-400">仕掛け</p>
                <p className="font-semibold text-slate-700 truncate">
                  {selected.rig || '--'}
                </p>
              </div>
            </div>

            {selected.comment && (
              <div className="mt-4 bg-slate-50 rounded-2xl p-4 text-sm text-slate-600">
                {selected.comment}
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                className="flex-1 rounded-2xl bg-blue-600 hover:bg-blue-700 transition text-white py-3 font-semibold"
                onClick={startEdit}
              >
                編集
              </button>

              <button
                className="flex-1 rounded-2xl bg-red-500 hover:bg-red-600 transition text-white py-3 font-semibold"
                onClick={remove}
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Form Modal ===== */}
      {(mode === 'new' || mode === 'edit') && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-40">
          <div className="bg-white w-full sm:w-[92%] sm:max-w-lg rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="w-16 h-1.5 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden" />

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  🎣 釣果記録
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  釣れた魚の情報を記録します
                </p>
              </div>

              <button
                onClick={reset}
                className="text-slate-400 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <input
                className="w-full bg-slate-100 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="魚種"
                value={form.fishType}
                onChange={(e) =>
                  setForm({ ...form, fishType: e.target.value })
                }
              />

              <input
                type="datetime-local"
                className="w-full bg-slate-100 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500"
                value={form.date}
                onChange={(e) =>
                  setForm({ ...form, date: e.target.value })
                }
              />

              <div className="grid grid-cols-3 gap-3">
                <input
                  className="bg-slate-100 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="サイズ"
                  value={form.size}
                  onChange={(e) =>
                    setForm({ ...form, size: e.target.value })
                  }
                />

                <input
                  className="bg-slate-100 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="重量"
                  value={form.weight}
                  onChange={(e) =>
                    setForm({ ...form, weight: e.target.value })
                  }
                />

                <input
                  className="bg-slate-100 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="水深"
                  value={form.depth}
                  onChange={(e) =>
                    setForm({ ...form, depth: e.target.value })
                  }
                />
              </div>

              <input
                className="w-full bg-slate-100 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="仕掛け"
                value={form.rig}
                onChange={(e) =>
                  setForm({ ...form, rig: e.target.value })
                }
              />

              <textarea
                className="w-full bg-slate-100 rounded-2xl px-4 py-4 min-h-[120px] outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="コメント"
                value={form.comment}
                onChange={(e) =>
                  setForm({ ...form, comment: e.target.value })
                }
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={reset}
                className="flex-1 bg-slate-200 text-slate-700 py-4 rounded-2xl font-semibold"
              >
                キャンセル
              </button>

              <button
                onClick={save}
                className="flex-1 bg-blue-600 hover:bg-blue-700 transition text-white py-4 rounded-2xl font-semibold shadow-lg"
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