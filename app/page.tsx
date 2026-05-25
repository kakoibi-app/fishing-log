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
  date: string;
  userId: string;
};

const emptyForm = {
  fishType: '',
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

  /* ===== Fetch ===== */
  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      const q = query(
        collection(db, 'records'),
        where('userId', '==', user.uid)
      );

      const snap = await getDocs(q);

      const data: any[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() }));

      setRecords(data);
    };

    fetch();
  }, [user]);

  /* ===== Map Click（新規） ===== */
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
    console.log("保存クリック");

    if (!user) return;

    try {
      if (mode === 'new' && pos) {
        const newData = {
          ...form,
          lat: pos.lat,
          lng: pos.lng,
          userId: user.uid,
        };

        const ref = await addDoc(collection(db, 'records'), newData);

        setRecords((prev) => [...prev, { ...newData, id: ref.id }]);
      }

      if (mode === 'edit' && selected) {
        const ref = doc(db, 'records', selected.id);

        const updateData = {
          fishType: form.fishType,
          date: form.date,
        };

        await updateDoc(ref, updateData);

        setRecords((prev) =>
          prev.map((r) =>
            r.id === selected.id ? { ...r, ...updateData } : r
          )
        );
      }
    } catch (e) {
      console.error("保存エラー", e);
    }

    reset();
  };

  /* ===== 削除 ===== */
  const remove = async () => {
    if (!selected) return;

    await deleteDoc(doc(db, 'records', selected.id));

    setRecords((prev) => prev.filter((r) => r.id !== selected.id));
    setSelected(null);
  };

  /* ===== 編集開始 ===== */
  const startEdit = () => {
    if (!selected) return;

    setMode('edit');
    setForm({
      fishType: selected.fishType,
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
  if (loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <div>
        <button onClick={login}>ログイン</button>
      </div>
    );
  }

  return (
    <>
      <button onClick={logout}>ログアウト</button>

      <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100vh' }}
          center={{ lat: 35.6, lng: 139.6 }}
          zoom={9}
          onClick={handleMapClick}
        >
          {records.map((r) => (
            <Marker
              key={r.id}
              position={{ lat: r.lat, lng: r.lng }}
              onClick={() => setSelected(r)}
            />
          ))}
        </GoogleMap>
      </LoadScript>

      {/* 詳細 */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-4">
            <div>{selected.fishType}</div>
            <button onClick={startEdit}>編集</button>
            <button onClick={remove}>削除</button>
            <button onClick={() => setSelected(null)}>閉じる</button>
          </div>
        </div>
      )}

      {/* フォーム */}
      {(mode === 'new' || mode === 'edit') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-4">
            <input
              placeholder="魚種"
              value={form.fishType}
              onChange={(e) =>
                setForm({ ...form, fishType: e.target.value })
              }
            />

            <input
              type="datetime-local"
              value={form.date}
              onChange={(e) =>
                setForm({ ...form, date: e.target.value })
              }
            />

            <button onClick={save}>保存</button>
            <button onClick={reset}>キャンセル</button>
          </div>
        </div>
      )}
    </>
  );
}