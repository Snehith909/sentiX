import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function parseSRT(srt) {
  if (!srt) return [];
  const blocks = srt.replace(/\r\n/g, '\n').split(/\n\n+/);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;
    let idx = 0;
    if (/^\d+$/.test(lines[0])) idx = 1;
    const m = lines[idx].match(/(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/);
    if (!m) continue;
    const toSec = t => { const p = t.replace(',', '.').split(':'); return parseInt(p[0])*3600 + parseInt(p[1])*60 + parseFloat(p[2]); };
    const start = toSec(m[1]);
    const end = toSec(m[2]);
    const text = lines.slice(idx+1).join(' ');
    cues.push({ start, end, text });
  }
  return cues;
}

export default function Player() {
  const nav = useNavigate();
  const videoRef = useRef(null);
  const [videoObj, setVideoObj] = useState(null);
  const [cues, setCues] = useState([]);
  const [currentCue, setCurrentCue] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [selectedWord, setSelectedWord] = useState(null);
  const [explainText, setExplainText] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem('sentix:currentVideo');
    if (!raw) return nav('/watch');
    try { setVideoObj(JSON.parse(raw)); } catch (e) { nav('/watch'); }
  }, [nav]);

  // If the persisted video already includes SRT text (from Watch.generate), parse it immediately
  useEffect(() => {
    if (!videoObj) return;
    if (videoObj.srt) {
      try {
        const parsed = parseSRT(videoObj.srt);
        setCues(parsed);
      } catch (e) {
        console.error('failed to parse persisted srt', e);
      }
    }
  }, [videoObj]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      setTime(v.currentTime);
      const c = cues.find(x => v.currentTime >= x.start && v.currentTime <= x.end);
      setCurrentCue(c || null);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onLoaded = () => setDuration(v.duration || 0);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('loadedmetadata', onLoaded);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('loadedmetadata', onLoaded);
    };
  }, [cues]);

  const togglePlay = () => { const v = videoRef.current; if (!v) return; if (v.paused) v.play(); else v.pause(); };
  const onSeek = e => { const v = videoRef.current; if (!v) return; v.currentTime = (Number(e.target.value)/100) * duration; };
  const onVolume = e => { const v = videoRef.current; if (!v) return; v.volume = Number(e.target.value); setVolume(v.volume); };

  const handleChooseAnother = () => { try { localStorage.removeItem('sentix:currentVideo'); } catch(e){}; nav('/watch'); };

  const handleSrtUpload = async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const txt = await f.text(); setCues(parseSRT(txt));
  };

  const clickWord = async (word) => {
    if (!word) return; setSelectedWord(word); setExplainText('Loading...');
    try { const res = await fetch('/api/explain', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ text: word }) }); const j = await res.json(); setExplainText(j.meaning || JSON.stringify(j)); } catch(e){ setExplainText('Error'); }
  };

  const clickSentence = async (sent) => { setExplainText('Loading...'); try { const res = await fetch('/api/explain', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ text: sent }) }); const j = await res.json(); setExplainText(j.meaning || JSON.stringify(j)); } catch(e){ setExplainText('Error'); } };

  const [generating, setGenerating] = useState(false);
  const handleGenerate = async () => {
    if (!videoObj) return;
    setGenerating(true);
    setExplainText('Generating subtitles...');
    try {
      const payload = {};
      if (videoObj.storagePath) payload.storagePath = videoObj.storagePath;
      else payload.downloadURL = videoObj.downloadURL;
      const res = await fetch('/api/generate-subtitles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) {
        setExplainText('Generation failed: ' + (j.error || res.statusText));
        setGenerating(false);
        return;
      }
      const srt = j.srt || j.srtContent || j.srtText || '';
      if (srt) {
        const parsed = parseSRT(srt);
        setCues(parsed);
        setExplainText('Subtitles generated');
      } else {
        setExplainText('No subtitles returned');
      }
    } catch (e) {
      console.error('generate error', e);
      setExplainText('Generation error');
    } finally { setGenerating(false); }
  };

  if (!videoObj) return null;
  const src = videoObj.downloadURL;

  const timeDisplay = s => {
    if (!s || isNaN(s)) return '00:00'; const mm = Math.floor(s/60).toString().padStart(2,'0'); const ss = Math.floor(s%60).toString().padStart(2,'0'); return `${mm}:${ss}`;
  };

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <div className="relative bg-black rounded overflow-hidden">
              <video
                ref={videoRef}
                src={src}
                controls={false}
                className="w-full bg-black object-contain"
                style={{ aspectRatio: '16/9', maxHeight: '70vh' }}
              />

              <div className="absolute left-0 right-0 bottom-6 flex justify-center pointer-events-none">
                <div className="max-w-[85%] pointer-events-auto bg-[rgba(0,0,0,0.6)] px-4 py-2 rounded text-lg text-white">
                  {currentCue ? (
                    <div className="text-center" onClick={() => { const v = videoRef.current; if (v) v.pause(); }}>
                      <div>
                        {currentCue.text.split(/(\s+)/).map((tok, i) => {
                          if (/^\s+$/.test(tok)) return tok;
                          const plain = tok.replace(/[^\w]+/g, '');
                          const isSelected = selectedWord && selectedWord.toLowerCase() === plain.toLowerCase();
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => { clickWord(plain); const v = videoRef.current; if (v) v.pause(); }}
                              className={isSelected ? 'bg-yellow-400 text-black rounded px-1' : 'hover:underline px-1'}
                            >
                              {tok}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400">No subtitles loaded</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center gap-3">
                <button onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, v.currentTime - 10); }} className="px-3 py-2 border rounded">⏪</button>
                <button onClick={togglePlay} className="px-4 py-2 bg-yellow-600 text-black rounded">{playing ? 'Pause' : 'Play'}</button>
                <button onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.min((v.duration||0), v.currentTime + 10); }} className="px-3 py-2 border rounded">⏩</button>

                <div className="flex-1 mx-4 flex items-center gap-3">
                  <div className="text-sm text-slate-300 w-12">{timeDisplay(time)}</div>
                  <input type="range" min="0" max="100" value={duration ? (time / duration * 100) : 0} onChange={onSeek} className="flex-1" />
                  <div className="text-sm text-slate-300 w-12 text-right">{timeDisplay(duration)}</div>
                </div>

                <div className="flex items-center gap-2">
                  <input type="range" min="0" max="1" step="0.01" value={volume} onChange={onVolume} className="w-28" />
                  <button onClick={() => { const v = videoRef.current; if (!v) return; if (document.fullscreenElement) document.exitFullscreen(); else v.requestFullscreen?.(); }} className="px-3 py-2 border rounded">[ ]</button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <button onClick={handleChooseAnother} className="px-3 py-2 border rounded">Choose Another Video</button>
              </div>
              <div className="flex items-center gap-3">
                <label className="px-3 py-2 border rounded cursor-pointer">Upload .SRT
                  <input type="file" accept=".srt,.vtt" className="hidden" onChange={handleSrtUpload} />
                </label>
                <button onClick={handleGenerate} disabled={generating} className="px-3 py-2 bg-white text-black rounded">{generating ? 'Generating...' : 'Generate'}</button>
              </div>
            </div>
          </div>

          <aside className="w-80 bg-[rgba(255,255,255,0.02)] border border-gray-800 rounded p-6">
            <div className="text-center">
              <div className="text-3xl text-gray-400 mb-4">📚</div>
              <h3 className="font-semibold mb-2">Language Tools</h3>
              {!explainText ? (
                <p className="text-sm text-slate-400">Click a word for its definition.<br/>Or, click a whole sentence for an explanation.</p>
              ) : (
                <div className="text-left">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">{selectedWord || 'Explanation'}</div>
                  </div>
                  <div className="mt-3 text-sm text-slate-200">{explainText}</div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
