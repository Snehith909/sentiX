import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Login from './pages/Login';
import Watch from './pages/Watch';
import Home from './pages/Home';
import Navbar from './components/Navbar';

export default function App(){
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="p-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/watch" element={<Watch />} />
        </Routes>
      </main>
    </div>
  )
}
