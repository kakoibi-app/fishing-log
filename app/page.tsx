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

type Mode = 'new' | 'edit' | null;

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
  date: new Date().toISOString().slice(0, 16),
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [records, setRecords] = useState<RecordType[]>([]);
  const [mode, setMode] = useState<Mode>(null);
  const [activeRecord, setActiveRecord] = useState<RecordType | null>(null);
  const [draftPos, setDraftPos] = useState<{ lat: number; lng: number } | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  /* ---------- Auth ---------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    setUser(result.user);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  /* ---------- Fetch ---------- */
  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      const q = query(
        collection(db, 'records'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const data: RecordType[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...(d.data() as any) }));
      setRecords(data);
    };

    fetch();
  }, [user]);

  /* ---------- Map ---------- */
  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    setMode('new');
    setDraftPos({
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    });
    setForm(emptyForm);
    setShowForm(true);
  };

  /* ---------- Save ---------- */
  const save = async () => {
    if (!user) return;

    if (mode === 'new' && draftPos) {
      const docRef = await addDoc(collection(db, 'records'), {
        ...form,
        ...draftPos,
        userId: user.uid,
      });
      setRecords((p) => [...p, { ...form, ...draftPos, userId: user.uid, id: docRef.id }]);
    }

    if (mode === 'edit' && activeRecord) {
      const ref = doc(db, 'records', activeRecord.id);
      await updateDoc(ref, form);
      setRecords((p) =>
        p.map((r) => (r.id === activeRecord.id ? { ...r, ...form } : r))
      );
    }

    closeForm();
  };

  const remove = async () => {
    if (!activeRecord) return;
    await deleteDoc(doc(db, 'records', activeRecord.id));
    setRecords((p) => p.filter((r) => r.id !== activeRecord.id));
    setActiveRecord(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setMode(null);
    setActiveRecord(null);
    setDraftPos(null);
    setForm(emptyForm);
  };

  /* ---------- UI ---------- */
  if (loading) return <div className="h-screen flex items-center justify-center">Loading…</div>;

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <button onClick={login} className="bg-blue-600 text-white px-6 py-3 rounded">
          Googleでログイン
        </button>
      </div>
    );
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white h-14 flex justify-between items-center px-4 shadow z-10">
        <span>🎣 Fishing Log</span>
        <button onClick={logout} className="bg-red-500 text-white px-3 py-1 rounded">
          ログアウト
        </button>
      </header>

      <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100vh' }}
          center={{ lat: 35.6895, lng: 139.6917 }}
          zoom={10}
          onClick={onMapClick}
        >
          {records.map((r) => (
            <Marker
              key={r.id}
              position={{ lat: r.lat, lng: r.lng }}
              onClick={() => setActiveRecord(r)}
            />
          ))}
        </GoogleMap>
      </LoadScript>

      {activeRecord && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20">
          <div className="bg-white p-4 rounded w-80">
            <p>魚種：{activeRecord.fishType}</p>
            <button
              onClick={() => {
                setMode('edit');
                setForm(activeRecord);
                setShowForm(true);
                setActiveRecord(null);
              }}
              className="w-full bg-blue-600 text-white py-2 mt-2"
            >
              編集
            </button>
            <button onClick={remove} className="w-full bg-red-600 text-white py-2 mt-2">
              削除
            </button>
            <button onClick={() => setActiveRecord(null)} className="w-full mt-2">
              閉じる
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30">
          <div className="bg-white p-4 rounded w-80">
            <input
              className="w-full border p-2 mb-2"
              placeholder="魚種"
              value={form.fishType}
              onChange={(e) => setForm({ ...form, fishType: e.target.value })}
            />
            <button onClick={save} className="w-full bg-blue-600 text-white py-2">
              保存
            </button>
            <button onClick={closeForm} className="w-full mt-2">
              キャンセル
            </button>
          </div>
        </div>
      )}
    </>
  );
}