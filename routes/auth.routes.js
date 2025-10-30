const express = require('express');
const router = express.Router();

// Router-level sanitizer: remove surrounding curly braces and stray whitespace
// e.g. convert "{{user@example.com}}" -> "user@example.com"
router.use((req, res, next) => {
    try {
        if (req.body && typeof req.body.email === 'string') {
            req.body.email = req.body.email.replace(/[{}\s]/g, '');
        }
    } catch (err) {
        // don't block the request for sanitizer errors; validation will catch bad input
    }
    next();
});
const { body, validationResult } = require('express-validator');
const {
    registerUser,
    loginUser,
    requestPasswordReset,
    updateUserProfile,
    verifyEmail,
    deleteUser
} = require('../auth');

// Middleware to verify Firebase ID token
const authenticateUser = async (req, res, next) => {
    try {
        const idToken = req.headers.authorization?.split('Bearer ')[1];
        if (!idToken) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decodedToken = await auth.verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Input validation middleware
const validateRegistration = [
    // sanitize any remaining curly braces, then validate and normalize
    body('email')
        .optional()
        .customSanitizer(value => (value || '').replace(/[{}\s]/g, ''))
        .isEmail()
        .normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('displayName').optional().trim().notEmpty(),
];

const validateLogin = [
    body('email')
        .optional()
        .customSanitizer(value => (value || '').replace(/[{}\s]/g, ''))
        .isEmail()
        .normalizeEmail(),
    body('password').notEmpty(),
];

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, displayName, photoURL } = req.body;
    const result = await registerUser(email, password, { displayName, photoURL });

    if (result.success) {
        res.status(201).json(result);
    } else {
        res.status(400).json(result);
    }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
    console.log('[DEBUG] Login request received:', {
        email: req.body.email,
        headers: req.headers,
        timestamp: new Date().toISOString()
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('[DEBUG] Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log('[DEBUG] Attempting login with sanitized email:', email);
    
    const result = await loginUser(email, password);
    console.log('[DEBUG] Login result:', {
        success: result.success,
        error: result.error,
        userId: result.userId
    });

    if (result.success) {
        res.json(result);
    } else {
        res.status(401).json(result);
    }
});

// Request password reset
router.post('/password-reset', 
    body('email')
        .optional()
        .customSanitizer(value => (value || '').replace(/[{}\s]/g, ''))
        .isEmail()
        .normalizeEmail(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const result = await requestPasswordReset(req.body.email);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    }
);

// Update user profile (protected route)
router.put('/profile',
    authenticateUser,
    body('displayName').optional().trim().notEmpty(),
    body('photoURL').optional().isURL(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const result = await updateUserProfile(req.user.uid, req.body);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    }
);

// Verify email
router.post('/verify-email', authenticateUser, async (req, res) => {
    const result = await verifyEmail(req.user.uid);
    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json(result);
    }
});

// Delete account (protected route)
router.delete('/account', authenticateUser, async (req, res) => {
    const result = await deleteUser(req.user.uid);
    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json(result);
    }
});

module.exports = router;