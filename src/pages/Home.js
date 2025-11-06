import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen font-sans text-white bg-[#0b0f14]">
      {/* Top nav */}
      <nav className="w-full bg-transparent">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-yellow-400 text-2xl">🎓</span>
            <span className="font-bold text-white">SentiX</span>
          </div>

          <ul className="hidden md:flex items-center space-x-8 text-sm text-slate-300">
            <li className="hover:text-white"><a href="#">Home</a></li>
            <li className="hover:text-white"><a href="#">Watch & Learn</a></li>
            <li className="hover:text-white"><a href="#">My Dictionary</a></li>
            <li className="hover:text-white"><a href="#">Practice</a></li>
          </ul>

          <div className="flex items-center space-x-3">
            <button className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded border border-gray-700 text-slate-300">🌙</button>
            <button className="px-3 py-1 rounded bg-transparent border border-gray-700 text-slate-300">Sign In</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="py-24">
        <div className="max-w-4xl mx-auto text-center px-6">
          <div className="text-yellow-400 text-5xl mb-4">🎓</div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-yellow-400 leading-tight">Learn English Through Movies</h1>
          <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
            Master English naturally by watching movies with interactive subtitles, building your vocabulary, and practicing with AI.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Link to="/watch" className="bg-yellow-400 text-black font-bold py-3 px-6 rounded shadow inline-block">Get Started</Link>
            <Link to="/watch" className="bg-transparent border border-gray-700 text-slate-300 py-3 px-5 rounded inline-block">Try Demo</Link>
          </div>
        </div>
      </header>

      {/* Feature cards */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <article className="rounded-xl border border-gray-800 bg-[rgba(255,255,255,0.01)] p-8 shadow-lg">
              <div className="text-yellow-400 text-3xl mb-4">▶️</div>
              <h3 className="text-xl font-semibold mb-2">Interactive Videos</h3>
              <p className="text-sm text-slate-400 mb-6">Click on any word in movie subtitles to get instant definitions, pronunciations, and explanations.</p>
              <Link to="/watch" className="w-full py-3 rounded border border-gray-700 text-slate-200 inline-block text-center">Start Watching</Link>
            </article>

            <article className="rounded-xl border border-gray-800 bg-[rgba(255,255,255,0.01)] p-8 shadow-lg">
              <div className="text-yellow-400 text-3xl mb-4">📖</div>
              <h3 className="text-xl font-semibold mb-2">Personal Dictionary</h3>
              <p className="text-sm text-slate-400 mb-6">Save words you learn and track your progress with a personalized vocabulary collection.</p>
              <Link to="/dictionary" className="w-full py-3 rounded border border-gray-700 text-slate-200 inline-block text-center">View Dictionary</Link>
            </article>

            <article className="rounded-xl border border-gray-800 bg-[rgba(255,255,255,0.01)] p-8 shadow-lg">
              <div className="text-yellow-400 text-3xl mb-4">💬</div>
              <h3 className="text-xl font-semibold mb-2">AI Practice</h3>
              <p className="text-sm text-slate-400 mb-6">Practice vocabulary with quizzes and engage in conversations with our AI tutor.</p>
              <Link to="/practice" className="w-full py-3 rounded border border-gray-700 text-slate-200 inline-block text-center">Start Practice</Link>
            </article>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-32">
        <div className="max-w-2xl mx-auto text-center px-6">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to improve your English?</h2>
          <p className="text-slate-400 mb-6">Join thousands of learners who are mastering English through cinema.</p>
          <Link to="/login" className="bg-yellow-400 text-black font-bold py-3 px-6 rounded inline-block">Sign Up Now</Link>
        </div>
      </section>
    </div>
  );
}
