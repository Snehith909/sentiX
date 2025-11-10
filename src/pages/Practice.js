import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import VoiceChat from '../components/VoiceChat';

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function Practice(){
  const { user } = useAuth();
  const [tab, setTab] = useState('vocab'); // vocab | text | voice
  const [words, setWords] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [numQuestions, setNumQuestions] = useState(5);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  // Text chat state
  const [chatMessages, setChatMessages] = useState([]); // { from: 'user'|'bot', text }
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [textConnected, setTextConnected] = useState(false);
  const [voiceConnected, setVoiceConnected] = useState(false);

  useEffect(() => {
    if (!user) return;
    try {
      const col = collection(db, 'dictionary');
      const q = query(col, where('ownerUid', '==', user.uid));
      const unsub = onSnapshot(q, (snap) => {
        const arr = [];
        snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
        console.debug('[Practice] onSnapshot loaded', arr.length, 'words');
        setWords(arr);
      }, (err) => {
        console.error('practice snapshot error', err);
      });
      return () => unsub();
    } catch (e) {
      console.error('practice: snapshot setup error', e);
    }
  }, [user]);

  const buildQuestions = (count = 5) => {
    const pool = [...words];
    if (pool.length === 0) return [];
    // normalize fields so we tolerate different document shapes
    const norm = pool.map(p => ({
      id: p.id,
      word: p.word || p.original || p.entry || p.text || '',
      meaning: p.meaning || p.definition || p.def || '',
      example: p.example || p.exampleSentence || p.exampleText || p.context || '',
      raw: p
    })).filter(p => p.word);
    if (norm.length === 0) return [];
    const qs = [];
    // shuffle pool to pick random words
    shuffle(norm);
    for (let i = 0; i < Math.min(count, norm.length); i++) {
      const correct = norm[i];
      // pick up to 3 distractors from remaining pool
      const others = norm.slice(0, i).concat(norm.slice(i+1));
      shuffle(others);
      const distractors = others.slice(0, 3).map(o => o.word);
      const options = shuffle([correct.word, ...distractors]);

      // pick question type: if we have an example sentence, sometimes use fill-in-the-blank
      const example = correct.example || '';
      const useBlank = example && Math.random() < 0.5;
      if (useBlank) {
        // replace the word with blank in the example if possible
        const blanked = example.replace(new RegExp(correct.word, 'gi'), '____');
        qs.push({
          id: correct.id,
          type: 'blank',
          question: blanked || (correct.meaning || 'Fill in the blank'),
          answer: correct.word,
          options,
          explanation: correct.meaning || ''
        });
      } else {
        qs.push({
          id: correct.id,
          type: 'definition',
          question: correct.meaning || 'Which word matches this meaning?',
          answer: correct.word,
          options,
          example: correct.example || ''
        });
      }
    }
    return qs;
  };

  const startQuiz = () => {
    console.debug('[Practice] startQuiz user:', user ? { uid: user.uid, email: user.email } : null, 'words length:', words.length);
    const qs = buildQuestions(numQuestions);
    if (!user) {
      alert('Please sign in to use your saved words for quizzes.');
      return;
    }
    if (qs.length === 0) {
      alert('Not enough words to build a quiz. Add words to your dictionary first.');
      return;
    }
    setQuestions(qs);
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setAnswered(false);
    setIsCorrect(false);
  };

  const checkAnswer = () => {
    if (!questions[current] || answered) return;
    const correct = questions[current].answer;
    const ok = selected === correct;
    setAnswered(true);
    setIsCorrect(ok);
    if (ok) setScore(s => s + 1);
  };

  const nextQuestion = () => {
    if (current + 1 < questions.length) {
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
      setIsCorrect(false);
    } else {
      // finished
      setAnswered(true);
    }
  };

  const restart = () => {
    startQuiz();
  };

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Practice Mode</h1>

        <div className="mb-6">
            <div className="flex gap-3">
            <button onClick={() => setTab('vocab')} className={`px-4 py-2 rounded ${tab==='vocab' ? 'bg-gray-800' : 'bg-transparent border border-gray-700'}`}>Vocabulary Quiz</button>
            <button onClick={() => setTab('text')} className={`px-4 py-2 rounded ${tab==='text' ? 'bg-gray-800' : 'bg-transparent border border-gray-700'}`}>Text Chat</button>
            <button onClick={() => setTab('voice')} className={`px-4 py-2 rounded ${tab==='voice' ? 'bg-gray-800' : 'bg-transparent border border-gray-700'}`}>Voice Chat</button>
          </div>
        </div>

        {tab === 'vocab' && (
          <div className="bg-[rgba(255,255,255,0.02)] rounded p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Vocabulary Quiz</h2>
            <p className="mb-4">You have {words.length} words in your dictionary</p>
            <div className="text-sm text-slate-400 mb-4">{user ? `Signed in as ${user.email || user.uid}` : 'Not signed in'}</div>
            <div className="flex items-center gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Number of Questions</label>
                <input type="number" min="1" max={Math.max(1, words.length)} value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} className="w-40 p-2 bg-transparent border border-gray-700 rounded" />
              </div>
              <div className="ml-auto">
                <button onClick={startQuiz} className="px-4 py-3 bg-yellow-600 text-black rounded">Start Quiz ({numQuestions} questions)</button>
              </div>
            </div>

            {questions.length > 0 && (
              <div className="mt-6 bg-[rgba(0,0,0,0.3)] p-6 rounded border border-gray-800">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-slate-400">Question {current+1} of {questions.length}</div>
                  <div className="text-sm text-slate-400">Score: {score}/{questions.length}</div>
                </div>

                {/* progress bar */}
                <div className="w-full h-2 bg-gray-800 rounded mb-6">
                  <div className="h-2 bg-white rounded" style={{ width: `${Math.round(((current) / Math.max(1, questions.length)) * 100)}%` }} />
                </div>

                <div className="text-lg font-semibold mb-3">{questions[current].type === 'blank' ? 'Fill in the blank:' : ''}</div>
                <div className="mb-4 text-xl">{questions[current].type === 'blank' ? questions[current].question : questions[current].question}</div>

                <div className="space-y-3">
                  {questions[current].options.map(opt => {
                    const isAns = opt === questions[current].answer;
                    const isSelected = opt === selected;
                    let classes = 'block p-4 border rounded flex items-center justify-between';
                    if (answered) {
                      if (isAns) classes += ' border-green-600 bg-[rgba(0,128,64,0.04)]';
                      if (isSelected && !isAns) classes += ' border-red-600 bg-[rgba(128,0,0,0.04)]';
                    } else {
                      classes += isSelected ? ' bg-gray-700' : ' bg-transparent';
                    }
                    return (
                      <button key={opt} disabled={answered} onClick={() => setSelected(opt)} className={classes}>
                        <div className="flex items-center"><input type="radio" name="opt" value={opt} checked={selected===opt} readOnly className="mr-3" />{opt}</div>
                        {answered && isAns && <span className="text-green-400">✓</span>}
                        {answered && isSelected && !isAns && <span className="text-red-400">✕</span>}
                      </button>
                    );
                  })}
                </div>

                {answered && (
                  <div className={`mt-6 p-4 rounded ${isCorrect ? 'bg-[rgba(0,0,0,0.45)] border border-green-700' : 'bg-[rgba(0,0,0,0.45)] border border-red-700'}`}>
                      <div className="font-semibold mb-1">{isCorrect ? 'Correct!' : 'Incorrect'}</div>
                      <div className="text-sm text-slate-300">{questions[current].answer} - {questions[current].explanation || questions[current].example || 'This is the right answer.'}</div>
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  {answered && current + 1 < questions.length && (
                    <button onClick={nextQuestion} className="px-4 py-2 bg-white text-black rounded">Next Question</button>
                  )}
                  {answered && current + 1 >= questions.length && (
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-slate-400">Quiz finished — Score {score}/{questions.length}</div>
                      <button onClick={restart} className="px-4 py-2 bg-yellow-600 text-black rounded">Restart</button>
                    </div>
                  )}
                  {!answered && (
                    <button onClick={checkAnswer} disabled={!selected} className="px-4 py-2 bg-white text-black rounded">Check Answer</button>
                  )}
                </div>
              </div>
            )}
            {/* Debug area: show loaded words (toggleable) */}
            <div className="mt-4 text-sm text-slate-400">
              <details>
                <summary className="cursor-pointer">Debug: show loaded words ({words.length})</summary>
                <pre className="mt-2 text-xs whitespace-pre-wrap">{JSON.stringify(words.map(w => ({ id: w.id, word: w.word || w.original || w.entry || w.text || '(no-word)' })), null, 2)}</pre>
              </details>
            </div>
          </div>
        )}

        {tab === 'text' && (
          <div className="py-6">
            {/* Connect card */}
            {!textConnected && (
              <div className="max-w-2xl mx-auto bg-[rgba(255,255,255,0.02)] rounded p-8 border border-gray-800 text-center">
                <div className="flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z"/></svg>
                  <h2 className="text-2xl font-semibold">Text Conversation</h2>
                </div>
                <p className="text-slate-400 mb-6">Have a typed conversation with AI to practice your English</p>
                <div className="mx-auto max-w-md">
                  <button onClick={() => setTextConnected(true)} className="w-full px-6 py-3 bg-white text-black rounded">Connect to Text Chat</button>
                </div>
              </div>
            )}

            {/* Chat UI: shown after connect */}
            <div style={{ display: textConnected ? 'block' : 'none' }} className="mt-6">
              <div className="max-w-2xl mx-auto bg-[#061017] rounded p-4 border border-gray-800">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm text-slate-400">Text Chat — type to practice</div>
                  <button onClick={() => setTextConnected(false)} className="px-3 py-1 rounded border border-gray-700 bg-transparent text-sm">Disconnect</button>
                </div>
                <div className="h-64 overflow-auto mb-3 p-2" id="chatBox">
                  {chatMessages.length === 0 && <div className="text-slate-400">No messages yet — say hi!</div>}
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`mb-2 ${m.from === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block px-3 py-2 rounded ${m.from === 'user' ? 'bg-yellow-600 text-black' : 'bg-gray-800 text-white'}`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} className="flex-1 p-2 bg-transparent border border-gray-700 rounded" placeholder="Type a message..." />
                  <button onClick={async () => {
                    if (!chatInput || chatLoading) return;
                    const text = chatInput.trim();
                    setChatMessages(m => [...m, { from: 'user', text }]);
                    setChatInput('');
                    setChatLoading(true);
                    try {
                      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:4000';
                      const resp = await fetch(`${apiBase}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) });
                      let j = null;
                      try { j = await resp.json(); } catch (e) { j = { error: `Response not JSON: ${e.message || String(e)}`, raw: await resp.text() }; }
                      if (resp.ok && j && j.reply) setChatMessages(m => [...m, { from: 'bot', text: j.reply }]);
                      else setChatMessages(m => [...m, { from: 'bot', text: j.error || (j.reply || (j.raw || 'No response')) }]);
                    } catch (err) {
                      setChatMessages(m => [...m, { from: 'bot', text: 'Chat failed: ' + (err.message || String(err)) }]);
                    } finally { setChatLoading(false); const box = document.getElementById('chatBox'); if (box) box.scrollTop = box.scrollHeight; }
                  }} className="px-4 py-2 bg-white text-black rounded" disabled={chatLoading}>{chatLoading ? '...' : 'Send'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'voice' && (
          <div className="py-6">
            {/* Connect card */}
            {!voiceConnected && (
              <div className="max-w-2xl mx-auto bg-[rgba(255,255,255,0.02)] rounded p-8 border border-gray-800 text-center">
                <div className="flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1v11m0 0c3.866 0 7 3.134 7 7v1H5v-1c0-3.866 3.134-7 7-7z" /></svg>
                  <h2 className="text-2xl font-semibold">Voice Conversation</h2>
                </div>
                <p className="text-slate-400 mb-6">Have a natural voice conversation with AI to practice your English</p>
                <div className="mx-auto max-w-md">
                  <button onClick={() => setVoiceConnected(true)} className="w-full px-6 py-3 bg-white text-black rounded">Connect to Voice Chat</button>
                </div>
              </div>
            )}

            {/* Voice UI: shown after connect */}
            <div style={{ display: voiceConnected ? 'block' : 'none' }} className="mt-6">
              <div className="max-w-3xl mx-auto">
                <div className="flex justify-end mb-3">
                  <button onClick={() => setVoiceConnected(false)} className="px-3 py-2 rounded border border-gray-700 bg-transparent text-sm">Disconnect</button>
                </div>
                <div className="bg-[rgba(255,255,255,0.02)] rounded p-6 border border-gray-800">
                  {/* VoiceChat component */}
                  <div id="voiceChatContainer">
                    <VoiceChat />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        
      </div>
    </div>
  );
}
