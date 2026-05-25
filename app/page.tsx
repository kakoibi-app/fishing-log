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

type Mode = 'idle' | 'new' | 'edit';

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
  /* ===== Auth ===== */
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* ===== Data ===== */
  const [records, setRecords] = useState<RecordType[]>([]);

  /* ===== UI State ===== */
  const [mode, setMode] = useState<Mode>('idle');
  const [activeRecord, setActiveRecord] = useState<RecordType | null>(null);
  const [draftPos, setDraftPos] = useState<{ lat: number; lng: number } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  /* ===== Auth Listener ===== */
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

  /* ===== Fetch Records ===== */
  useEffect(() => {
    if (!user) return;

    const fetchRecords = async () => {
      const q = query(
        collection(db, 'records'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const data: RecordType[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...(d.data() as any) }));
      setRecords(data);
    };

    fetchRecords();
  }, [user]);

  /* ===== Map Click (NEW) ===== */
  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    if (mode !== 'idle') return; // 編集中・入力中は無視

    setMode('new');
    setDraftPos({
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    });
    setForm(emptyForm);
    setShowForm(true);
  };
const toDateTimeLocal = (date: any) => {
  try {
    if (!date) return new Date().toISOString().slice(0, 16);

    // Firestore Timestamp対応
    if (date.seconds) {
      return new Date(date.seconds * 1000).toISOString().slice(0, 16);
    }

    return new Date(date).toISOString().slice(0, 16);
  } catch {
    return new Date().toISOString().slice(0, 16);
  }
};
  /* ===== Save ===== */
  const save = async () => {
    const safeForm = {
  fishType: String(form.fishType || ''),
  size: String(form.size || ''),
  weight: String(form.weight || ''),
  depth: String(form.depth || ''),
  rig: String(form.rig || ''),
  comment: String(form.comment || ''),
  date: typeof form.date === 'string'
    ? form.date
    : new Date().toISOString().slice(0, 16),
};
``
    if (!user) return;

    if (mode === 'new' && draftPos) {
      const newData = {
        ...form,
        ...draftPos,
        userId: user.uid,
      };

      const ref = await addDoc(collection(db, 'records'), newData);
      setRecords((prev) => [...prev, { ...newData, id: ref.id }]);
    }

    if (mode === 'edit' && activeRecord) {
  try {
    console.log("編集開始", activeRecord.id);

    const ref = doc(db, 'records', activeRecord.id);

    const safeForm = {
      fishType: String(form.fishType || ''),
      size: String(form.size || ''),
      weight: String(form.weight || ''),
      depth: String(form.depth || ''),
      rig: String(form.rig || ''),
      comment: String(form.comment || ''),
      date: typeof form.date === 'string'
        ? form.date
        : new Date().toISOString().slice(0, 16),
    };

    console.log("更新データ", safeForm);

    await updateDoc(ref, safeForm);

    console.log("✅ 更新成功");

    setRecords((prev) =>
      prev.map((r) =>
        r.id === activeRecord.id ? { ...r, ...safeForm } : r
      )
    );

  } catch (error) {
    console.error("❌ 更新失敗", error);
  }
}

// ✅ 追加する関数（handleSaveの外）
const refresh = async () => {
  const q = query(
    collection(db, 'records'),
    where('userId', '==', user.uid)
  );

  const snap = await getDocs(q);

  const data:any[] = [];
  snap.forEach((d) => data.push({ id: d.id, ...d.data() }));

  setRecords(data);
};

    resetState();
  };

  /* ===== Delete ===== */
  const remove = async () => {
    if (!activeRecord) return;
    await deleteDoc(doc(db, 'records', activeRecord.id));
    setRecords((prev) => prev.filter((r) => r.id !== activeRecord.id));
    resetState();
  };

  /* ===== Reset ===== */
  const resetState = () => {
    setMode('idle');
    setActiveRecord(null);
    setDraftPos(null);
    setForm(emptyForm);
    setShowForm(false);
  };

  /* ===== UI ===== */
  if (loading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <button
          onClick={login}
          className="bg-blue-600 text-white px-6 py-3 rounded"
        >
          Googleでログイン
        </button>
      </div>
    );
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-14 bg-white shadow flex items-center justify-between px-4 z-10">
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
              onClick={() => {
                if (mode !== 'idle') return;
                setActiveRecord(r);
              }}
            />
          ))}
        </GoogleMap>
      </LoadScript>

      {/* 詳細 */}
      {activeRecord && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20">
          <div className="bg-white p-4 rounded w-80">
            <p>魚種：{activeRecord.fishType}</p>
            <button
              onClick={() => {
                setMode('edit');

setForm({
  fishType: activeRecord.fishType || '',
  size: activeRecord.size || '',
  weight: activeRecord.weight || '',
  depth: activeRecord.depth || '',
  rig: activeRecord.rig || '',
  comment: activeRecord.comment || '',
  date:
    typeof activeRecord.date === "string"
      ? activeRecord.date
      : new Date().toISOString().slice(0, 16),
});
setShowForm(true);
setActiveRecord(null);
              }}
              className="w-full bg-blue-600 text-white py-2 mt-2"
            >
              編集
            </button>
            <button
              onClick={remove}
              className="w-full bg-red-600 text-white py-2 mt-2"
            >
              削除
            </button>
            <button onClick={() => setActiveRecord(null)} className="w-full mt-2">
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* フォーム */}
      {showForm && (
        
<div
  className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 pointer-events-auto"
  onClick={(e) => e.stopPropagation()} // ←追加
>

          <div className="bg-white p-4 rounded w-80">
            <input
  type="datetime-local"
  value={
    typeof form.date === "string"
      ? form.date
      : new Date().toISOString().slice(0, 16)
  }
  onChange={(e) =>
    setForm({ ...form, date: e.target.value })
  }
/>
            
<button
  onClick={() => {
    console.log("保存クリック確認");
    save();
  }}
  className="w-full bg-blue-600 text-white py-2"
>
  保存
</button>

            <button onClick={resetState} className="w-full mt-2">
              キャンセル
            </button>
          </div>
        </div>
      )}
    </>
  );
}