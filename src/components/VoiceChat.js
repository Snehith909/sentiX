import React, { useEffect, useRef, useState } from 'react';

export default function VoiceChat() {
  const [recording, setRecording] = useState(false);
  const [mediaSupported, setMediaSupported] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [sending, setSending] = useState(false);
  const [useHF, setUseHF] = useState(false);
  const [hfToken, setHfToken] = useState(localStorage.getItem('sentix:hf_token') || '');
  const [model, setModel] = useState(localStorage.getItem('sentix:voice_model') || 'openai/whisper-small');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    setMediaSupported(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
  }, []);

  const startRecording = async () => {
    if (!mediaSupported) return alert('Media devices API not supported in this browser');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      // attach stream to recorder ref so we can stop tracks later
      mr.stream = stream;
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(b);
        const url = URL.createObjectURL(b);
        setAudioUrl(url);
      };
      mr.start();
      setRecording(true);
      setTranscript('');
    } catch (err) {
      console.error('startRecording error', err);
      alert('Could not start recording: ' + (err.message || err));
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    try {
      mr.stop();
      if (mr.stream) {
        try { mr.stream.getTracks().forEach(t => t.stop()); } catch (e) { }
      }
    } catch (e) {
      console.warn('stop error', e);
    }
    setRecording(false);
  };

  const playAudio = () => {
    if (!audioUrl) return;
    const a = new Audio(audioUrl);
    a.play().catch(e => console.error(e));
  };

  const clearRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setTranscript('');
  };

  const handleSend = async () => {
    if (!audioBlob) return alert('Record something first');
    if (hfToken && !localStorage.getItem('sentix:hf_token_saved')) {
      const ok = window.confirm('Store your HF token in localStorage for this app? (recommended for convenience)');
      if (ok) {
        localStorage.setItem('sentix:hf_token', hfToken);
        localStorage.setItem('sentix:hf_token_saved', '1');
      }
    }

    setSending(true);
    try {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      const fd = new FormData();
      fd.append('audio', audioBlob, 'recording.webm');
      if (model) fd.append('model', model);
      // ask server to return a chat reply too
      fd.append('reply', '1');

      const headers = {};
      if (useHF && hfToken) headers['x-hf-token'] = hfToken;

      const resp = await fetch(`${apiBase}/api/voice`, { method: 'POST', body: fd, headers });
      let j = null;
      try { j = await resp.json(); } catch (e) { j = { error: 'Invalid JSON response', raw: await resp.text() }; }
      if (resp.ok && j && (j.transcript || j.reply)) {
        if (j.transcript) setTranscript(j.transcript);
        if (j.reply) setTranscript(t => (t ? t + '\n\n' + j.reply : j.reply));
      } else {
        alert('Voice API error: ' + (j.error || JSON.stringify(j)));
      }
    } catch (err) {
      console.error('send voice error', err);
      alert('Send failed: ' + (err.message || err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-[rgba(255,255,255,0.02)] rounded p-6 border border-gray-800 max-w-3xl">
      <h3 className="text-lg font-semibold mb-3">Voice Chat</h3>
      <div className="text-sm text-slate-400 mb-4">Record your voice, preview, and send to the server for speech-to-text and model reply. Choose whether to use hosted inference.</div>

      <div className="mb-4">
        <div className="flex gap-3">
          <button onClick={startRecording} disabled={recording} className={`px-4 py-2 rounded ${recording ? 'bg-gray-700' : 'bg-red-600'}`}>Record</button>
          <button onClick={stopRecording} disabled={!recording} className="px-4 py-2 rounded bg-yellow-600">Stop</button>
          <button onClick={playAudio} disabled={!audioUrl} className="px-4 py-2 rounded bg-white text-black">Play</button>
          <button onClick={clearRecording} disabled={!audioUrl} className="px-4 py-2 rounded bg-transparent border border-gray-700">Clear</button>
        </div>
        <div className="mt-3 text-sm text-slate-400">Status: {recording ? 'Recording…' : audioBlob ? 'Recorded' : 'Idle'}</div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3">
        <label className="text-sm text-slate-400">Use hosted HF inference</label>
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={useHF} onChange={e => setUseHF(e.target.checked)} />
          <div className="text-sm text-slate-300">When checked, the HF token (below) will be used to call Hugging Face hosted endpoints. Leave unchecked to use server-local processing.</div>
        </div>

        <div>
          <label className="block text-sm text-slate-400">HF Token (optional)</label>
          <input value={hfToken} onChange={e => setHfToken(e.target.value)} placeholder="hf_..." className="w-full p-2 bg-transparent border border-gray-700 rounded" />
        </div>

        <div>
          <label className="block text-sm text-slate-400">Model (optional)</label>
          <input value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. openai/whisper-large or my-voice-model" className="w-full p-2 bg-transparent border border-gray-700 rounded" />
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <button onClick={handleSend} disabled={sending || !audioBlob} className="px-4 py-2 bg-white text-black rounded">{sending ? 'Sending…' : 'Send'}</button>
        <div className="text-sm text-slate-400">Transcript / Reply</div>
      </div>

      <div className="mt-4 bg-[#061017] p-3 rounded border border-gray-800 min-h-[120px]">
        <pre className="whitespace-pre-wrap text-sm">{transcript || <span className="text-slate-500">No transcript yet</span>}</pre>
      </div>
    </div>
  );
}

