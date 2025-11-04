import React from 'react';

export default function Watch(){
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Watch & Learn</h1>
      <div className="bg-white p-4 rounded shadow">
        <video controls className="w-full rounded">
          <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <div className="mt-4">
          <p className="text-sm text-gray-600">Click any subtitle word to get an explanation (demo not wired yet).</p>
        </div>
      </div>
    </div>
  )
}
