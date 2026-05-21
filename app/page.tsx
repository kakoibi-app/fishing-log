'use client';

import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { useState, useEffect } from 'react';

import { db } from '../src/lib/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

import { auth } from '../src/lib/firebase';
import { setPersistence, browserLocalPersistence } from "firebase/auth";
await setPersistence(auth, browserLocalPersistence);
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

import { doc, updateDoc } from 'firebase/firestore';
import { deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from "firebase/auth";

type Record = {
  id?: string
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

const containerStyle = {
  width: '100%',
  height: 'calc(100vh - 56px)',
};

const center = {
  lat: 35.6895,
  lng: 139.6917,
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [currentPos, setCurrentPos] = useState<any>(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState('');
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
  fishType: '',
  size: '',
  weight: '',
  depth: '',
  rig: '',
  comment: '',
  date: new Date().toISOString().slice(0, 16),
});
  
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);


  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
  if (isLoggingIn) return;

  try {
    setIsLoggingIn(true);

    const provider = new GoogleAuthProvider();

    const result = await signInWithPopup(auth, provider);

    setUser(result.user);

  } catch (error) {
    console.error(error);
  } finally {
    setIsLoggingIn(false);
  }
};

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };
  
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    setUser(user);
    setLoading(false); // ←これ追加
  });

  return () => unsubscribe();
}, []);


  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const q = query(
        collection(db, 'records'),
        where('userId', '==', user.uid)
      );

      const snapshot = await getDocs(q);

      let data: any[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));

      const now = new Date();

      if (filter === 'today') {
        data = data.filter(r =>
          new Date(r.date).toDateString() === now.toDateString()
        );
      }

      if (filter === 'week') {
        data = data.filter(r =>
          now.getTime() - new Date(r.date).getTime() < 7 * 86400000
        );
      }

      setRecords(data);
    };

    fetchData();
  }, [user, filter]);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
  if (!e.latLng) return;

  const pos = {
    lat: e.latLng.lat(),
    lng: e.latLng.lng(),
  };

  setCurrentPos(pos);
  setShowForm(true);
};

  const handleCancel = () => {
  setShowForm(false);
  setCurrentPos(null);

  setForm({
    fishType: '',
    size: '',
    weight: '',
    depth: '',
    rig: '',
    comment: '',
    date: new Date().toISOString().slice(0, 16),
  });
};


    const handleSave = async () => {

  // ✅ 編集の場合（currentPosなくてもOK）
  if (editingRecord) {
    const newData = {
      userId: user.uid,
      lat: editingRecord.lat,  // ←これ重要
      lng: editingRecord.lng,
      ...form
    };

    const ref = doc(db, 'records', editingRecord.id);
    await updateDoc(ref, newData);

    setRecords(prev =>
      prev.map(r => r.id === editingRecord.id ? { ...r, ...newData } : r)
    );

    setEditingRecord(null);
  }
  else {
    // ✅ 新規（currentPos必要）
    if (!currentPos) return;

    const newData = {
      userId: user.uid,
      lat: currentPos.lat,
      lng: currentPos.lng,
      ...form
    };

    await addDoc(collection(db, 'records'), newData);

    setRecords(prev => [...prev, newData]);
  }

  if (navigator.vibrate) navigator.vibrate(100);

  setShowForm(false);
  setCurrentPos(null);

  setForm({
    fishType: '',
    size: '',
    weight: '',
    depth: '',
    rig: '',
    comment: '',
    date: new Date().toISOString().slice(0, 16),
  });
};
  const handleDelete = async () => {
    if (!selectedRecord) return;

    const ref = doc(db, 'records', selectedRecord.id);

    await deleteDoc(ref);

    setRecords(prev => prev.filter(r => r.id !== selectedRecord.id));

    setSelectedRecord(null);

    if (navigator.vibrate) navigator.vibrate(200);
  };

  const getCurrentLocation = () => {
  navigator.geolocation.getCurrentPosition((pos) => {
    const location = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };

    setCurrentPos(location);
    setShowForm(true);
  });
};

  // ✅ まずローディング判定
if (loading) {
  return (
    <div className="flex items-center justify-center h-screen">
      読み込み中...
    </div>
  );
}

// ✅ その後でログイン判定
if (!user) {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-300 to-blue-500">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
        <h1 className="text-xl font-bold text-gray-800 mb-4">釣果ログ</h1>
        <button
          disabled={isLoggingIn}
          onClick={handleLogin}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
        >
          Googleでログイン
        </button>
      </div>
    </div>
  );
}

  return (
    <>
      <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        
        {/* ヘッダー */}
        <div className="fixed top-0 left-0 right-0 h-14 bg-white flex items-center justify-between px-4 shadow z-20">
          <span className="font-bold text-gray-900">🎣 Fishing Log</span>

          <div className="flex gap-2">
            <select
              className="border px-2 text-gray-800"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">全期間</option>
              <option value="today">今日</option>
              <option value="week">7日間</option>
            </select>

            <button
              disabled={isLoggingIn}
              onClick={handleLogout}
              className="bg-red-500 text-white px-3 rounded"
            >
              ログアウト
            </button>
          </div>
        </div>

        {/* 現在地ボタン */}
        <div className="fixed top-16 left-4 z-10">
          <button
            onClick={() => {
              const next = !useCurrentLocation;
              setUseCurrentLocation(next);
              if (next) getCurrentLocation();
            }}
            className={`px-4 py-2 rounded shadow font-medium ${
              useCurrentLocation
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-900'
            }`}
          >
            現在地にピン（{useCurrentLocation ? 'ON' : 'OFF'}）
          </button>
        </div>

        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={10}
          onClick={handleMapClick}
        >
          {records.map((r, i) => (
            <Marker
              key={i}
              position={{ lat: r.lat, lng: r.lng }}
              
              onClick={() => {
                setSelectedRecord(r);
                setEditingRecord(r);
              }}

            />

          ))}

          {currentPos && (
            <Marker
              position={currentPos}
              icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }}
            />
          )}
        </GoogleMap>
      </LoadScript>

      {/* ✅ フォーム復活 */}
      {currentPos && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg">
          
        <input
          autoFocus
          className="w-full border border-gray-300 bg-white p-2 rounded text-gray-900"
          placeholder="魚種"
          value={form.fishType}
          onChange={(e)=>setForm({...form,fishType:e.target.value})}
        />

          <button
            onClick={handleSave}
            className="w-full bg-blue-600 text-white p-2 rounded"
          >
            保存
          </button>
        </div>
      )}

      {/* トースト */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm text-white px-4 py-2 rounded">
          {toast}
        </div>
      )}
      {showForm && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
    
    <div className="bg-[#f9fafb] w-[90%] max-w-md rounded-2xl p-5 shadow-2xl">

      <h2 className="text-lg font-bold mb-3 text-gray-900">
        🎣 釣果記録
      </h2>

      <input
        className="w-full border border-gray-300 bg-white p-2 rounded text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
        placeholder="魚種"
        value={form.fishType}
        onChange={(e)=>setForm({...form,fishType:e.target.value})}
      />

      <input
        type="datetime-local"
        className="w-full border border-gray-300 bg-white p-2 rounded text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
        value={form.date}
        onChange={(e)=>setForm({...form,date:e.target.value})}
      />

      <div className="grid grid-cols-3 gap-2 mb-2">
        <input className="w-full border border-gray-300 bg-white p-2 rounded text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 rounded" placeholder="サイズ"
          value={form.size}
          onChange={(e)=>setForm({...form,size:e.target.value})}
        />
        <input className="w-full border border-gray-300 bg-white p-2 rounded text-gray-900 placeholder-gray-400 rounded" placeholder="重量"
          value={form.weight}
          onChange={(e)=>setForm({...form,weight:e.target.value})}
        />
        <input className="w-full border border-gray-300 bg-white p-2 rounded text-gray-900 placeholder-gray-400 rounded" placeholder="水深"
          value={form.depth}
          onChange={(e)=>setForm({...form,depth:e.target.value})}
        />
      </div>

      <input className="w-full border border-gray-300 bg-white p-2 rounded text-gray-900 placeholder-gray-400" placeholder="仕掛け"
        value={form.rig}
        onChange={(e)=>setForm({...form,rig:e.target.value})}
      />

      <textarea className="w-full border border-gray-300 bg-white p-2 rounded text-gray-900 placeholder-gray-400"
        placeholder="コメント"
        value={form.comment}
        onChange={(e)=>setForm({...form,comment:e.target.value})}
      />

      <div className="flex gap-2">
        <button onClick={handleCancel}
          className="flex-1 border border-gray-300 py-2 rounded text-gray-700 bg-white">
          キャンセル
        </button>

        <button onClick={handleSave}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold">
          保存
        </button>
      </div>

    </div>
  </div>
)}
{selectedRecord && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
    
    <div className="bg-white p-5 rounded-2xl w-[90%] max-w-sm shadow-2xl">

      <h2 className="font-bold text-lg mb-3 text-gray-900">
        🎣 釣果詳細
      </h2>

      <div className="text-gray-800 space-y-1">
        <p><span className="font-semibold">魚種：</span>{selectedRecord.fishType}</p>
        <p><span className="font-semibold">サイズ：</span>{selectedRecord.size}</p>
        <p><span className="font-semibold">水深：</span>{selectedRecord.depth}</p>
        <p><span className="font-semibold">仕掛け：</span>{selectedRecord.rig}</p>
        <p><span className="font-semibold">コメント：</span>{selectedRecord.comment}</p>
      </div>

      <button
        onClick={() => setSelectedRecord(null)}
        className="mt-4 w-full bg-gray-800 text-white py-2 rounded"
      >
        閉じる
      </button>
      
      <button
        onClick={() => {
          setForm(selectedRecord);
          setShowForm(true);
          setSelectedRecord(null);
        }}
        className="mt-2 w-full bg-blue-600 text-white py-2 rounded"
      >
        編集する
      </button>
      
      <button
        onClick={handleDelete}
        className="mt-2 w-full bg-red-600 text-white py-2 rounded"
      >
        削除
      </button>



    </div>
  </div>
)}
      
    </>
    
  );
}