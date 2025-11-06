import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar(){
  const { user, signOut } = useAuth();

  return (
    <nav className="bg-transparent">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 text-white font-bold text-lg">
            <span className="text-yellow-400">🎓</span>
            <span>SentiX</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-gray-200">
            <Link to="/" className="hover:text-white">Home</Link>
            <Link to="/watch" className="hover:text-white">Watch & Learn</Link>
            <Link to="/dictionary" className="hover:text-white">My Dictionary</Link>
            <Link to="/practice" className="hover:text-white">Practice</Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="hidden md:inline text-yellow-400">🌙</button>
          {user ? (
            <div className="flex items-center gap-3">
              {user.photoURL ? <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">U</div>}
              <span className="text-gray-200 hidden sm:inline">{user.displayName || user.email}</span>
              <button onClick={signOut} className="px-3 py-1.5 border border-gray-600 rounded text-gray-200">Sign out</button>
            </div>
          ) : (
            <Link to="/login" className="px-3 py-1.5 border border-gray-600 rounded text-gray-200">Sign In</Link>
          )}
        </div>
      </div>
    </nav>
  )
}
