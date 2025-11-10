import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useVideo } from '../context/VideoContext';

export default function Dictionary(){
  const { user } = useAuth();
  const [words, setWords] = useState([]);
  const navigate = useNavigate();
  const { setVideoObj, restoreFromLocalStorage } = useVideo();

  useEffect(() => {
    if (!user) return;
    const col = collection(db, 'dictionary');
    const q = query(col, where('ownerUid', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach(docu => arr.push({ id: docu.id, ...docu.data() }));
      setWords(arr);
    }, (err) => {
      console.error('dictionary snapshot error', err);
    });
    return () => unsub();
  }, [user]);

  if (!user) return (
    <div className="min-h-screen bg-[#0b0f14] text-white p-6">
      <div className="max-w-4xl mx-auto">Please sign in to view your dictionary.</div>
    </div>
  );

  const remove = async (id) => {
    try {
      await deleteDoc(doc(db, 'dictionary', id));
    } catch (e) { console.error(e); alert('Delete failed: ' + e.message); }
  };

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">My Dictionary</h1>
        <div className="grid grid-cols-2 gap-6">
          {words.length === 0 ? (
            <div className="col-span-2 text-slate-400">No saved words yet. Save words from the player language tools.</div>
          ) : words.map(w => (
            <div key={w.id} className="bg-[rgba(255,255,255,0.02)] border border-gray-800 rounded p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xl font-semibold">{w.word}</div>
                  {w.meaning && <div className="text-sm text-slate-300 mt-2">{w.meaning}</div>}
                </div>
                  <div className="flex items-center gap-3">
                  <button onClick={() => {
                    console.log('[Dictionary] Open Player clicked, restoring video before navigate');
                    // try context restore first
                    let restored = null;
                    try {
                      restored = restoreFromLocalStorage();
                    } catch (e) { console.error(e); }
                    // if restoreFromLocalStorage returned null try reading raw
                    if (!restored) {
                      try {
                        const raw = localStorage.getItem('sentix:currentVideo');
                        if (raw) {
                          const parsed = JSON.parse(raw);
                          setVideoObj(parsed);
                          restored = parsed;
                        }
                      } catch (e) { console.error(e); }
                    }
                    // navigate and pass the video via state to be safe
                    navigate('/watch/player', { state: { videoObj: restored || null } });
                  }} className="text-slate-400 hover:text-white">Open Player</button>
                  <button onClick={() => remove(w.id)} className="text-red-400">Delete</button>
                </div>
              </div>
              {w.definitions && w.definitions.length > 0 && (
                <ul className="mt-3 list-disc list-inside text-sm text-slate-300">
                  {w.definitions.slice(0,5).map((d, i) => <li key={i}><strong>{d.partOfSpeech}</strong>: {d.definition}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
