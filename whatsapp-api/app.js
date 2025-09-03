// app.js
// Ejemplo básico de API REST con Express y WhatsApp Web.js

const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('./index');
const multer = require('multer');
const upload = multer();
const qrcode = require('qrcode');

const app = express();
app.use(express.json());

// Manejo de múltiples sesiones (multiempresa)
const sessions = {};

function createClient(sessionId) {
    const client = new Client({
        puppeteer: { headless: true },
        authStrategy: new LocalAuth({ clientId: sessionId })
    });
    client.lastQr = null;
    client.isAuthenticated = false;

    client.on('qr', (qr) => {
        client.lastQr = qr;
        client.isAuthenticated = false;
        console.log(`[${sessionId}] QR recibido.`);
    });

    client.on('ready', () => {
        client.isAuthenticated = true;
        client.lastQr = null;
        console.log(`[${sessionId}] Cliente listo para usar.`);
    });

    client.on('authenticated', () => {
        client.isAuthenticated = true;
        client.lastQr = null;
        console.log(`[${sessionId}] Cliente autenticado.`);
    });

    client.initialize();
    return client;
}

// Endpoint para crear/iniciar sesión
app.post('/session', (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) {
        return res.status(400).json({ error: 'Falta sessionId' });
    }
    if (sessions[sessionId]) {
        return res.status(400).json({ error: 'Sesión ya existe' });
    }
    const client = createClient(sessionId);
    sessions[sessionId] = client;
    res.json({ success: true, message: `Sesión ${sessionId} creada` });
});

// Endpoint para cerrar sesión
app.post('/session/logout', async (req, res) => {
    const { sessionId } = req.body;
    const client = sessions[sessionId];
    if (!client) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    try {
        await client.logout();
        delete sessions[sessionId];
        res.json({ success: true, message: `Sesión ${sessionId} cerrada` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint para listar sesiones activas
app.get('/session/list', (req, res) => {
    res.json({ sessions: Object.keys(sessions) });
});
// Endpoint para obtener el QR en base64 para una sesión
app.get('/auth/qr/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const client = sessions[sessionId];
    if (!client) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    if (client.lastQr) {
        qrcode.toDataURL(client.lastQr, (err, url) => {
            if (err) {
                return res.status(500).json({ error: 'Error generando QR' });
            }
            res.json({ qr: url });
        });
    } else if (client.isAuthenticated) {
        res.json({ message: 'Ya autenticado' });
    } else {
        res.status(404).json({ error: 'QR no disponible aún' });
    }
});

// Endpoint mejorado para consultar el estado de autenticación de una sesión
app.get('/auth/status/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const client = sessions[sessionId];
    if (!client) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    let state = null;
    let info = null;
    let authenticated = false;
    try {
        if (client.getState) {
            state = await client.getState();
            authenticated = state === 'CONNECTED';
        }
        if (client.info) {
            info = client.info;
        }
    } catch (err) {
        // Puede fallar si el cliente no está listo
    }
    if (authenticated || client.isAuthenticated) {
        res.json({ authenticated: true, state, info, message: 'Cliente autenticado correctamente' });
    } else {
        res.json({ authenticated: false, state, info, message: 'No autenticado' });
    }
});

// Endpoint para enviar mensajes (requiere sessionId)
app.post('/send', async (req, res) => {
    const { sessionId, phone, message } = req.body;
    if (!sessionId || !phone || !message) {
        return res.status(400).json({ error: 'Faltan parámetros: sessionId, phone, message' });
    }
    const client = sessions[sessionId];
    if (!client) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    const cleanPhone = String(phone).replace(/[^0-9]/g, '');
    const chatId = `${cleanPhone}@c.us`;
    try {
        const result = await client.sendMessage(chatId, message);
        res.json({ success: true, result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Endpoint para enviar archivos (form-data o base64)
app.post('/send-file', upload.single('file'), async (req, res) => {
    const { sessionId, phone, message, fileBase64, fileName, mimeType } = req.body;
    if (!sessionId || !phone || (!req.file && !fileBase64)) {
        return res.status(400).json({ error: 'Faltan parámetros: sessionId, phone, file (form-data) o fileBase64' });
    }
    const client = sessions[sessionId];
    if (!client) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    const cleanPhone = String(phone).replace(/[^0-9]/g, '');
    const chatId = `${cleanPhone}@c.us`;
    let media;
    try {
        if (req.file) {
            media = new MessageMedia(req.file.mimetype, req.file.buffer.toString('base64'), req.file.originalname);
        } else if (fileBase64 && fileName && mimeType) {
            media = new MessageMedia(mimeType, fileBase64, fileName);
        } else {
            return res.status(400).json({ error: 'Faltan datos para el archivo' });
        }
        const result = await client.sendMessage(chatId, media, { caption: message });
        res.json({ success: true, result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Endpoint para enviar mensajes a múltiples números
app.post('/send-multiple', async (req, res) => {
    const { sessionId, phones, message } = req.body;
    if (!sessionId || !phones || !Array.isArray(phones) || !message) {
        return res.status(400).json({ error: 'Faltan parámetros: sessionId, phones (array), message' });
    }
    const client = sessions[sessionId];
    if (!client) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    const results = [];
    for (const phone of phones) {
        const cleanPhone = String(phone).replace(/[^0-9]/g, '');
        const chatId = `${cleanPhone}@c.us`;
        try {
            const result = await client.sendMessage(chatId, message);
            results.push({ phone, success: true, result });
        } catch (err) {
            results.push({ phone, success: false, error: err.message });
        }
    }
    res.json({ results });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
});
