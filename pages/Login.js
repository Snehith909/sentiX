import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login(){
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleGoogle = async () => {
    try{
      await signInWithGoogle();
      navigate('/');
    }catch(e){
      setError(e.message);
    }
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setError(null);
    try{
      if(isSignup){
        await signUpWithEmail(email, password);
      }else{
        await signInWithEmail(email, password);
      }
      navigate('/');
    }catch(e){
      setError(e.message);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-semibold mb-4">{isSignup ? 'Create account' : 'Sign in'}</h2>
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      <div className="space-y-3">
        <button onClick={handleGoogle} className="w-full bg-red-600 text-white py-2 rounded">Continue with Google</button>
        <form onSubmit={handleEmail} className="mt-3">
          <input className="w-full mb-2 p-2 border rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input type="password" className="w-full mb-2 p-2 border rounded" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">{isSignup ? 'Create account' : 'Sign in'}</button>
        </form>
        <div className="text-sm text-center">
          <button onClick={()=>setIsSignup(s=>!s)} className="text-blue-600 underline">{isSignup ? 'Have an account? Sign in' : "Don't have an account? Create one"}</button>
        </div>
      </div>
    </div>
  )
}
