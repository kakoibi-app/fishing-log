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

        const updateData = {
          fishType: form.fishType,
          size: form.size,
          weight: form.weight,
          depth: form.depth,
          rig: form.rig,
          comment: form.comment,
          date: form.date,
        };

        await updateDoc(ref, updateData);
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

  /* ===== UI ===== */
  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-blue-100">
        <button
          onClick={login}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl"
        >
          Googleログイン
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-14 bg-white shadow flex items-center justify-between px-4 z-20">
        <b>🎣 Fishing Log</b>
        <button onClick={logout} className="bg-red-500 text-white px-3 rounded">
          ログアウト
        </button>
      </div>

      <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100vh' }}
          center={{ lat: 35.6, lng: 139.6 }}
          zoom={9}
          onClick={handleMapClick}
        >
          {records.map((r) => (
            <Marker
              key={r.id + r.fishType + r.date}
              position={{ lat: r.lat, lng: r.lng }}
              onClick={() => setSelected(r)}
            />
          ))}
        </GoogleMap>
      </LoadScript>

      {/* 詳細 */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30">
          <div className="bg-white p-5 rounded-xl w-[90%] max-w-sm">
            <p>魚種：{selected.fishType}</p>
            <p>サイズ：{selected.size}</p>
            <p>重量：{selected.weight}</p>
            <p>コメント：{selected.comment}</p>

            <button className="w-full mt-2 bg-blue-600 text-white py-2 rounded" onClick={startEdit}>
              編集
            </button>

            <button className="w-full mt-2 bg-red-500 text-white py-2 rounded" onClick={remove}>
              削除
            </button>

            <button className="w-full mt-2 bg-gray-300 py-2 rounded" onClick={() => setSelected(null)}>
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* フォーム */}
      {(mode === 'new' || mode === 'edit') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white p-5 rounded-xl w-[90%] max-w-md space-y-2">

            <input className="w-full border p-2 rounded" placeholder="魚種"
              value={form.fishType}
              onChange={(e) => setForm({ ...form, fishType: e.target.value })}
            />

            <input className="w-full border p-2 rounded" placeholder="サイズ"
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
            />

            <input className="w-full border p-2 rounded" placeholder="重量"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
            />

            <textarea className="w-full border p-2 rounded" placeholder="コメント"
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
            />

            <input type="datetime-local"
              className="w-full border p-2 rounded"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />

            <button className="w-full bg-blue-600 text-white py-2 rounded" onClick={save}>
              保存
            </button>

            <button className="w-full bg-gray-300 py-2 rounded" onClick={reset}>
              キャンセル
            </button>

          </div>
        </div>
      )}
    </>
  );
}