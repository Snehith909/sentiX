const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for video upload
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function(req, file, cb) {
        // Create a unique filename with original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 2 * 1024 * 1024 * 1024 // 2GB limit
    },
    fileFilter: function(req, file, cb) {
        // Allowed video extensions
        const filetypes = /mp4|mov|avi|mkv/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = file.mimetype.startsWith('video/');
        
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Error: Only video files (mp4, mov, avi, mkv) are allowed!'));
        }
    }
});

// Video upload endpoint
router.post('/', upload.single('video'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'No file uploaded' 
            });
        }

        // Return success response with file details
        res.status(201).json({
            success: true,
            message: 'Video uploaded successfully!',
            data: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimeType: req.file.mimetype,
                path: `/uploads/${req.file.filename}`
            }
        });
    } catch (error) {
        console.error('[ERROR] Video upload failed:', error);
        res.status(500).json({
            success: false,
            error: 'Video upload failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Download video from a URL (YouTube or generic HTTP/HTTPS)
router.post('/from-url', express.json(), async (req, res) => {
    const { url, filename: requestedFilename } = req.body || {};
    if (!url || typeof url !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing or invalid "url" in request body' });
    }

    const ytdl = require('ytdl-core');
    const axios = require('axios');

    // Helper to write a stream to file and await completion
    const streamToFile = (stream, filepath) => new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(filepath);
        stream.pipe(writeStream);
        writeStream.on('finish', () => resolve());
        writeStream.on('error', err => reject(err));
        stream.on('error', err => reject(err));
    });

    try {
        const isYouTube = ytdl.validateURL(url);
        let outFilename = requestedFilename;
        if (!outFilename) {
            // generate unique filename
            const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
            outFilename = `${unique}${isYouTube ? '.mp4' : path.extname(new URL(url).pathname) || '.mp4'}`;
        }
        const outPath = path.join(uploadsDir, outFilename);

        if (isYouTube) {
            // download highest quality mp4-ish stream
            const info = await ytdl.getInfo(url);
            const format = ytdl.chooseFormat(info.formats, { quality: 'highestvideo', filter: f => f.container === 'mp4' || f.container === 'm4a' || f.hasVideo });
            const downloadStream = ytdl.downloadFromInfo(info, { format });
            await streamToFile(downloadStream, outPath);
        } else {
            // generic URL download using axios stream
            const response = await axios({ url, method: 'GET', responseType: 'stream', timeout: 60000 });
            // If filename has no extension, try to infer from content-type
            if (!path.extname(outFilename)) {
                const contentType = response.headers['content-type'] || '';
                if (contentType.includes('mp4')) outFilename += '.mp4';
                else if (contentType.includes('webm')) outFilename += '.webm';
                else if (contentType.includes('mpeg')) outFilename += '.mpeg';
            }
            await streamToFile(response.data, outPath);
        }

        const stats = fs.statSync(outPath);
        return res.status(201).json({
            success: true,
            message: 'Video downloaded successfully',
            data: {
                filename: outFilename,
                size: stats.size,
                path: `/uploads/${outFilename}`,
                url: `http://localhost:5000/uploads/${outFilename}`
            }
        });
    } catch (error) {
        console.error('[ERROR] Download from URL failed:', error && (error.message || error));
        return res.status(500).json({
            success: false,
            error: 'Failed to download video from URL',
            details: process.env.NODE_ENV === 'development' ? (error.message || String(error)) : undefined
        });
    }
});

// Get list of uploaded videos
router.get('/list', (req, res) => {
    try {
        const files = fs.readdirSync(uploadsDir);
        const videos = files.filter(file => 
            /\.(mp4|mov|avi|mkv)$/i.test(file)
        ).map(file => ({
            filename: file,
            path: `/uploads/${file}`,
            url: `http://localhost:5000/uploads/${file}`
        }));

        res.json({
            success: true,
            data: videos
        });
    } catch (error) {
        console.error('[ERROR] Failed to list videos:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list videos',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Delete video endpoint
router.delete('/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(uploadsDir, filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({
                success: false,
                error: 'Video not found'
            });
        }

        fs.unlinkSync(filepath);
        res.json({
            success: true,
            message: 'Video deleted successfully'
        });
    } catch (error) {
        console.error('[ERROR] Failed to delete video:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete video',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;