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

  /** ========================
   * STATE
   ======================== */
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<RecordType[]>([]);

  const [mode, setMode] = useState<'new' | 'edit' | null>(null);
  const [selected, setSelected] = useState<RecordType | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);

  const [form, setForm] = useState(emptyForm);

  const [openMenu, setOpenMenu] = useState(false);

  const [groupMode, setGroupMode] = useState<'personal' | 'group'>('personal');
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);

  /** ========================
   * AUTH
   ======================== */
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

  /** ========================
   * GROUP
   ======================== */
  const fetchGroups = async () => {
    if (!user) return;

    const snap = await getDocs(
      query(collection(db, 'groupMembers'), where('userId', '==', user.uid))
    );

    const ids: string[] = [];
    snap.forEach(d => ids.push(d.data().groupId));

    const gSnap = await getDocs(collection(db, 'groups'));

    const list: any[] = [];
    gSnap.forEach(g => {
      if (ids.includes(g.id)) {
        list.push({ id: g.id, ...g.data() });
      }
    });

    setGroups(list);
  };

  const createGroup = async () => {
    const ref = await addDoc(collection(db, 'groups'), {
      name: '新しいグループ',
      ownerId: user.uid,
    });

    await addDoc(collection(db, 'groupMembers'), {
      groupId: ref.id,
      userId: user.uid,
    });

    fetchGroups();
  };

  /** ========================
   * DATA
   ======================== */
  const fetchRecords = async () => {
    if (!user) return;

    let q;

    if (groupMode === 'personal' || !selectedGroup) {
      q = query(collection(db, 'records'), where('userId', '==', user.uid));
    } else {
      q = query(collection(db, 'records'), where('groupId', '==', selectedGroup));
    }

    const snap = await getDocs(q);
    const data: any[] = [];
    snap.forEach(d => data.push({ id: d.id, ...d.data() }));

    setRecords(data);
  };

  useEffect(() => {
    fetchRecords();
  }, [user, filter, groupMode, selectedGroup]);

  useEffect(() => {
    fetchGroups();
  }, [user]);

  /** ========================
   * MAP
   ======================== */
  const handleMapClick = (e: any) => {
    if (!e.latLng || mode) return;

    setMode('new');
    setPos({
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    });
  };

  /** ========================
   * SAVE
   ======================== */
  const save = async () => {
    if (!pos) return;

    await addDoc(collection(db, 'records'), {
      ...form,
      lat: pos.lat,
      lng: pos.lng,
      userId: user.uid,
      groupId: groupMode === 'group' ? selectedGroup : null,
    });

    fetchRecords();
    setMode(null);
    setForm(emptyForm);
  };

  /** ========================
   * LOADING
   ======================== */
  if (loading) return <div>Loading...</div>;

  /** ========================
   * LOGIN
   ======================== */
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <button onClick={login}>Googleログイン</button>
      </div>
    );
  }

  /** ========================
   * MAIN
   ======================== */
  return (
    <>
      {/* Header */}
      <div className="p-3">
        <h1 className="font-bold text-lg">🎣 Fishing Log</h1>
        <p className="text-sm text-gray-500">釣果 {records.length} 件</p>
      </div>

      {/* MAP */}
      <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <GoogleMap
          mapContainerStyle={mapStyle}
          center={{ lat: 35.6, lng: 139.6 }}
          zoom={9}
          onClick={handleMapClick}
        >
          {records.map(r => (
            <Marker
              key={r.id}
              position={{ lat: r.lat, lng: r.lng }}
              onClick={() => setSelected(r)}
              icon={{
                url:
                  groupMode === 'group'
                    ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                    : 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              }}
            />
          ))}
        </GoogleMap>
      </LoadScript>

      {/* ☰ メニュー */}
      <div className="fixed left-4 bottom-24 z-50">
        <button
          onClick={() => setOpenMenu(!openMenu)}
          className="w-12 h-12 bg-black text-white rounded-full"
        >
          ☰
        </button>
      </div>

      {openMenu && (
        <div className="fixed left-4 bottom-36 bg-white p-3 rounded shadow w-48">
          <select
            value={groupMode}
            onChange={(e) => setGroupMode(e.target.value as any)}
            className="w-full"
          >
            <option value="personal">個人</option>
            <option value="group">グループ</option>
          </select>

          {groupMode === 'group' && (
            <select
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full mt-2"
            >
              <option value="">選択</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}

          <button className="mt-2 w-full" onClick={createGroup}>
            ＋グループ作成
          </button>

          <button className="mt-2 w-full" onClick={logout}>
            ログアウト
          </button>
        </div>
      )}

      {/* モーダル */}
      {mode && (
        <div className="fixed inset-0 bg-black/50 flex items-end">
          <div className="bg-white w-full p-4 rounded-t-2xl">
            <h2>釣果記録</h2>

            <input
              placeholder="魚種"
              value={form.fishType}
              onChange={(e) =>
                setForm({ ...form, fishType: e.target.value })
              }
            />

            <button onClick={save}>保存</button>
          </div>
        </div>
      )}
    </>
  );
}