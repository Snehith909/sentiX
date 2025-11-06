import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { storage, db } from '../firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Watch() {
	const [mode, setMode] = useState('url'); // 'url' | 'upload'
	const [videoUrl, setVideoUrl] = useState('');
	const fileRef = useRef(null);
	const { user } = useAuth();

	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [currentVideo, setCurrentVideo] = useState(null);
	const [previewUrl, setPreviewUrl] = useState(null);

	const navigate = useNavigate();

	const saveAndOpenPlayer = (videoObj) => {
		// persist current video to localStorage so Player page can read and update
		try {
			localStorage.setItem('sentix:currentVideo', JSON.stringify(videoObj));
		} catch (e) {
			console.warn('Unable to write currentVideo to localStorage', e);
		}
		navigate('/watch/player');
	};

	const handleLoadUrl = () => {
		if(!videoUrl) return;
		if(!user) return alert('Please sign in to save video');

		// store url record in Firestore and set as currentVideo
		(async ()=>{
			try{
				const docRef = await addDoc(collection(db, 'videos'), {
					ownerUid: user.uid,
					title: videoUrl,
					videoUrl,
					createdAt: serverTimestamp(),
					source: 'url'
				});
				const v = { id: docRef.id, downloadURL: videoUrl, title: videoUrl, uploading: false };
				setCurrentVideo(v);
				saveAndOpenPlayer(v);
			}catch(e){
				console.error(e);
				alert('Unable to save video URL: ' + e.message);
			}
		})();
	};

	const handleSelectFile = () => {
		if (fileRef.current) fileRef.current.click();
	};

	const handleFileChange = (e) => {
		const f = e.target.files && e.target.files[0];
		if (!f) return;
		if (!user) return alert('Please sign in to upload videos');

		// create an immediate preview from the local file
		const objectUrl = URL.createObjectURL(f);
		setPreviewUrl(objectUrl);
		const tempId = `tmp_${Date.now()}`;
		const draft = { tempId, id: null, downloadURL: objectUrl, title: f.name, uploading: true };
		setCurrentVideo(draft);
		// persist and open player immediately
		saveAndOpenPlayer(draft);

		// continue upload in background
		try {
			setUploading(true);
			const path = `videos/${user.uid}/${Date.now()}_${f.name}`;
			const sRef = storageRef(storage, path);
			const uploadTask = uploadBytesResumable(sRef, f, { contentType: f.type });

			uploadTask.on('state_changed', (snapshot) => {
				const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
				setProgress(pct);
			}, (err) => {
				console.error('upload error', err);
				setUploading(false);
				setCurrentVideo(null);
				alert('Upload failed: ' + err.message);
			}, async () => {
				const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
				// store metadata in Firestore
				const docRef = await addDoc(collection(db, 'videos'), {
					ownerUid: user.uid,
					title: f.name,
					storagePath: path,
					downloadURL,
					size: f.size,
					mimeType: f.type,
					createdAt: serverTimestamp(),
					source: 'upload'
				});
				// replace preview with final hosted URL
				const final = { tempId: draft.tempId, id: docRef.id, downloadURL, title: f.name, uploading: false };
				setCurrentVideo(final);
				// update persisted draft so Player page picks up the final hosted URL
				try { localStorage.setItem('sentix:currentVideo', JSON.stringify(final)); } catch(e){/* ignore */}
				setUploading(false);
				setProgress(0);
				// revoke the temporary object URL
				if (objectUrl) URL.revokeObjectURL(objectUrl);
				setPreviewUrl(null);
			});
		} catch (e) {
			console.error(e);
			setUploading(false);
			setCurrentVideo(null);
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
				setPreviewUrl(null);
			}
			alert('Upload failed: ' + e.message);
		}
	};

	useEffect(() => {
		return () => {
			// cleanup any leftover object URL on unmount
			if (previewUrl) URL.revokeObjectURL(previewUrl);
		};
	}, [previewUrl]);

	return (
		<div className="min-h-screen bg-[#0b0f14] text-white">
			<div className="max-w-6xl mx-auto px-6 py-10">
				<h1 className="text-3xl font-bold mb-8">Watch & Learn</h1>

				<div className="bg-[rgba(255,255,255,0.02)] rounded-lg p-6 mb-8 border border-gray-800">
					<div className="flex items-center gap-4 mb-6">
						<button onClick={() => setMode('url')} className={`px-6 py-2 rounded-tl-lg rounded-bl-lg ${mode === 'url' ? 'bg-gray-800 text-white' : 'bg-transparent text-slate-300 border border-gray-700'} `}>Video URL</button>
						<button onClick={() => setMode('upload')} className={`px-6 py-2 rounded-tr-lg rounded-br-lg ${mode === 'upload' ? 'bg-gray-800 text-white' : 'bg-transparent text-slate-300 border border-gray-700'} `}>Upload Video</button>
					</div>

					{mode === 'url' ? (
						<div>
							<label className="block text-sm text-slate-300 mb-2">Video URL</label>
							<div className="flex gap-3">
								<input value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="Enter video URL from YouTube, Terabox, etc." className="flex-1 p-3 bg-transparent border border-gray-700 rounded text-slate-200" />
								<button onClick={handleLoadUrl} className="px-4 py-2 bg-gray-700 text-white rounded">Load Video</button>
							</div>
						</div>
					) : (
						<div>
							<div className="border-2 border-dashed border-gray-700 rounded-lg p-12 text-center">
								<div className="text-4xl text-gray-500 mb-4">📁</div>
								<div className="text-lg font-semibold mb-2">Upload Video File</div>
								<div className="text-sm text-slate-400 mb-6">MP4, WebM, or OGG file. Max 500MB.</div>
								<button onClick={handleSelectFile} className="px-4 py-2 bg-white text-black rounded">Select Video</button>
								<input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
								{uploading && (
									<div className="mt-4 text-sm">Uploading... {progress}%</div>
								)}
							</div>
						</div>
					)}
				</div>

				<section className="bg-[rgba(255,255,255,0.02)] rounded-lg p-6 border border-gray-800">
					<h2 className="text-xl font-semibold mb-4">Sample Videos</h2>
					<div className="p-6 bg-[rgba(0,0,0,0.25)] rounded">
						<Link to="#" className="block w-72 p-4 bg-[rgba(255,255,255,0.02)] rounded shadow-sm">
							<div className="font-semibold text-slate-100">Sample Movie</div>
							<div className="text-sm text-slate-400 mt-2">A short sample video with English subtitles</div>
						</Link>
					</div>
				</section>

				{/* Video preview/player area */}
				{currentVideo && (
					<div className="mt-10 grid grid-cols-3 gap-6">
						<div className="col-span-2">
							<div className="bg-black rounded overflow-hidden">
								<video src={currentVideo.downloadURL} controls className="w-full h-96 object-contain bg-black" />
							</div>
							<div className="flex items-center gap-3 mt-3">
								<button className="px-3 py-2 border border-gray-700 rounded">Choose Another Video</button>
								<label className="px-3 py-2 border border-gray-700 rounded cursor-pointer">
									Upload .SRT
									<input type="file" accept=".srt,.vtt" className="hidden" />
								</label>
								<button onClick={async () => {
									if (!currentVideo) return alert('No video selected');
									try {
										const payload = {};
										if (currentVideo.storagePath) payload.storagePath = currentVideo.storagePath;
										else payload.downloadURL = currentVideo.downloadURL;
										const res = await fetch('/api/generate-subtitles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
										const j = await res.json();
										if (!res.ok) return alert('Generation failed: ' + (j.error || res.statusText));
										const srt = j.srt || '';
										const updated = { ...currentVideo, srt };
										try { localStorage.setItem('sentix:currentVideo', JSON.stringify(updated)); } catch (e) {}
										navigate('/watch/player');
									} catch (e) {
										console.error(e);
										alert('Generation error: ' + e.message);
									}
								}} className="px-3 py-2 bg-white text-black rounded">Generate</button>
							</div>
						</div>
						<aside className="col-span-1 bg-[rgba(255,255,255,0.02)] border border-gray-800 rounded p-6">
							<div className="text-center">
								<div className="text-3xl text-gray-400 mb-4"></div>
								<h3 className="font-semibold mb-2">Language Tools</h3>
								<p className="text-sm text-slate-400">Click a word for its definition. Or, click a whole sentence for an explanation.</p>
							</div>
						</aside>
					</div>
				)}
			</div>
		</div>
	);
}
