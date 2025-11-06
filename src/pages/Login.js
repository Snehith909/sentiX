import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login(){
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleGoogle = async () => {
    try{
      await signInWithGoogle();
      navigate('/watch');
    }catch(e){
      setError(e.message);
    }
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setError(null);
    try{
      if(isSignup){
        if(password !== confirm){
          setError('Passwords do not match');
          return;
        }
        const userCredential = await signUpWithEmail(email, password);
        // set display name on the created user
        if(userCredential && userCredential.user){
          await updateProfile(auth.currentUser, { displayName: fullName });
        }
      }else{
        await signInWithEmail(email, password);
      }
  navigate('/watch');
    }catch(e){
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#07121a] to-[#0b0f14]">
      <div className="w-full max-w-md bg-[rgba(255,255,255,0.03)] border border-gray-800 rounded-lg p-8 shadow-lg">
        <h2 className="text-2xl font-semibold mb-4 text-center text-white">{isSignup ? 'Create account' : 'Sign in'}</h2>
        {error && <div className="mb-3 text-sm text-red-400 text-center">{error}</div>}
        <div className="space-y-4">
          <div className="flex gap-2 justify-center">
            <button onClick={()=>setIsSignup(false)} className={`px-4 py-2 rounded ${!isSignup ? 'bg-gray-800 text-white' : 'bg-transparent text-slate-300 border border-gray-700'}`}>Sign In</button>
            <button onClick={()=>setIsSignup(true)} className={`px-4 py-2 rounded ${isSignup ? 'bg-gray-800 text-white' : 'bg-transparent text-slate-300 border border-gray-700'}`}>Sign Up</button>
          </div>

          <button onClick={handleGoogle} className="w-full bg-red-600 text-white py-2 rounded">Continue with Google</button>

          <form onSubmit={handleEmail} className="mt-2 space-y-3">
            {isSignup && (
              <input className="w-full p-3 bg-transparent border border-gray-700 rounded text-slate-200" placeholder="Full name" value={fullName} onChange={e=>setFullName(e.target.value)} />
            )}
            <input className="w-full p-3 bg-transparent border border-gray-700 rounded text-slate-200" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
            <input type="password" className="w-full p-3 bg-transparent border border-gray-700 rounded text-slate-200" placeholder={isSignup? 'Create a password' : 'Password'} value={password} onChange={e=>setPassword(e.target.value)} />
            {isSignup && (
              <input type="password" className="w-full p-3 bg-transparent border border-gray-700 rounded text-slate-200" placeholder="Confirm password" value={confirm} onChange={e=>setConfirm(e.target.value)} />
            )}

            <button type="submit" className="w-full bg-yellow-400 text-black py-3 rounded font-semibold">{isSignup ? 'Sign Up' : 'Sign In'}</button>
          </form>

          <div className="text-sm text-center text-slate-400">
            <button onClick={()=>setIsSignup(s=>!s)} className="underline">{isSignup ? 'Have an account? Sign in' : "Don't have an account? Create one"}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
