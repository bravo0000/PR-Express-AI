require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (index.html)
app.use(express.static(__dirname));

// Database Connection (SQLite)
const dbPath = path.resolve(__dirname, 'news.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('SQLite Connection Error:', err.message);
    else console.log('Connected to SQLite database at', dbPath);
});

// Init Tables
db.serialize(() => {
    // News Table
    db.run(`CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        summary TEXT,
        source_url TEXT,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Settings Table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        ai_model TEXT DEFAULT 'gemini-1.5-flash',
        extraction_prompt TEXT,
        generation_prompt TEXT,
        max_news_history INTEGER DEFAULT 50,
        organization_name TEXT DEFAULT 'สำนักงานที่ดินจังหวัดนครพนม',
        presidents_list TEXT,
        participants_list TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Initialize default settings if not exists
    db.get('SELECT * FROM settings WHERE id = 1', (err, row) => {
        if (!row) {
            const defaultExtractionPrompt = `คุณคือ AI ผู้ช่วยสำนักงานที่ดินจังหวัดนครพนม หน้าที่คือดึงข้อมูลจาก "หนังสือราชการ" หรือ "กำหนดการ" ที่ได้รับ
ให้ดึงข้อมูลออกมาเป็น JSON Format เท่านั้น โดยมี fields ดังนี้:
- date: วันที่จัดงาน (รูปแบบภาษาไทย เช่น 25 ธันวาคม 2568)
- time: เวลาเริ่มงาน (รูปแบบ HH.MM น.)
- event_name: ชื่องานหรือกิจกรรม
- location: สถานที่จัดงาน
- president_name: ชื่อประธานในพิธี (ถ้ามี)
- president_position: ตำแหน่งประธาน (ถ้ามี)
- participants: รายชื่อผู้เข้าร่วม หรือกลุ่มเป้าหมาย (ถ้ามี)

ถ้าหาข้อมูลไหนไม่เจอ ให้ใส่เป็น null หรือ string ว่าง
ไม่ต้องตอบอะไรมานอกจาก JSON`;

            const defaultGenerationPrompt = `คุณคือนักประชาสัมพันธ์มืออาชีพ ของสำนักงานที่ดินจังหวัดนครพนม
จงเขียน "ข่าวประชาสัมพันธ์" จากข้อมูลที่ให้ต่อไปนี้ 
โดยใช้ภาษาที่ เป็นทางการ, สละสลวย, ทันสมัย และน่าอ่าน 
(ใช้ Tone แบบ ข้าราชการยุคใหม่ แต่ยังคงความน่าเชื่อถือ)

โครงสร้างข่าว:
1. พาดหัวข่าว: สั้น กระชับ ดึงดูด (มี Emoji ได้นิดหน่อย)
2. เนื้อหา: ใคร ทำอะไร ที่ไหน เมื่อไหร่ อย่างไร (บรรยายบรรยากาศให้ดูดี)
3. การปฏิบัติหน้าที่: เน้นย้ำบทบาทของผู้บริหารและเจ้าหน้าที่
4. แฮชแท็ก: #สำนักงานที่ดินจังหวัดนครพนม #กรมที่ดิน #กระทรวงมหาดไทย #บำบัดทุกข์บำรุงสุข

ข้อมูล input จะเป็น JSON`;

            const defaultPresidents = `ว่าที่พันตรี อดิศักดิ์ น้อยสุวรรณ | ผู้ว่าราชการจังหวัดนครพนม
นายวีระ ฤกษ์วาณิชย์กุล | รองผู้ว่าราชการจังหวัดนครพนม
นายวรวิทย์ พิมพนิตย์ | รองผู้ว่าราชการจังหวัดนครพนม
ว่าที่ร้อยตรี รวยรุ่ง ใครบุตร | รองผู้ว่าราชการจังหวัดนครพนม
นายธเนศ ชาตะวราหะ | เจ้าพนักงานที่ดินจังหวัดนครพนม`;

            const defaultParticipants = `นายธเนศ ชาตะวราหะ เจ้าพนักงานที่ดินจังหวัดนครพนม | นายธเนศ ชาตะวราหะ (เจ้าพนักงานที่ดินฯ)
นายฉัตรชัย สาขี หัวหน้ากลุ่มงานวิชาการที่ดิน | นายฉัตรชัย สาขี (หน.วิชาการ)
พันจ่าตรีนครินทร์ พรหมมา หัวหน้าฝ่ายทะเบียน | พันจ่าตรีนครินทร์ พรหมมา (หน.ทะเบียน)
หัวหน้าฝ่ายรังวัด | หัวหน้าฝ่ายรังวัด
นางสาวพิสมัย นาโสก หัวหน้าฝ่ายอำนวยการ | นางสาวพิสมัย นาโสก (หน.อำนวยการ)
เจ้าหน้าที่สำนักงานที่ดินจังหวัดนครพนม | เจ้าหน้าที่สำนักงานที่ดินจังหวัดนครพนม (เหมา)`;

            db.run(`INSERT INTO settings (id, ai_model, extraction_prompt, generation_prompt, organization_name, presidents_list, participants_list) 
                    VALUES (1, 'gemini-1.5-flash', ?, ?, 'สำนักงานที่ดินจังหวัดนครพนม', ?, ?)`,
                [defaultExtractionPrompt, defaultGenerationPrompt, defaultPresidents, defaultParticipants],
                (err) => {
                    if (err) console.error('Error initializing settings:', err);
                    else console.log('✅ Default settings initialized');
                }
            );
        }
    });
});

// AI Configuration
try {
    const pkg = require('@google/generative-ai/package.json');
    console.log('📦 @google/generative-ai version:', pkg.version);
} catch (e) {
    console.log('Could not determine SDK version');
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// File Upload Config (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Helper Functions ---

// Convert Buffer to Generative Part
function fileToGenerativePart(buffer, mimeType) {
    return {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType
        },
    };
}

// System Prompt for Extraction
const EXTRACTION_PROMPT = `
คุณคือ AI ผู้ช่วยสำนักงานที่ดินจังหวัดนครพนม หน้าที่คือดึงข้อมูลจาก "หนังสือราชการ" หรือ "กำหนดการ" ที่ได้รับ
ให้ดึงข้อมูลออกมาเป็น JSON Format เท่านั้น โดยมี fields ดังนี้:
- date: วันที่จัดงาน (รูปแบบภาษาไทย เช่น 25 ธันวาคม 2568)
- time: เวลาเริ่มงาน (รูปแบบ HH.MM น.)
- event_name: ชื่องานหรือกิจกรรม
- location: สถานที่จัดงาน
- president_name: ชื่อประธานในพิธี (ถ้ามี)
- president_position: ตำแหน่งประธาน (ถ้ามี)
- participants: รายชื่อผู้เข้าร่วม หรือกลุ่มเป้าหมาย (ถ้ามี)

ถ้าหาข้อมูลไหนไม่เจอ ให้ใส่เป็น null หรือ string ว่าง
ไม่ต้องตอบอะไรมานอกจาก JSON
`;

// System Prompt for News Generation
const GENERATION_PROMPT = `
คุณคือนักประชาสัมพันธ์มืออาชีพ ของสำนักงานที่ดินจังหวัดนครพนม
จงเขียน "ข่าวประชาสัมพันธ์" จากข้อมูลที่ให้ต่อไปนี้ 
โดยใช้ภาษาที่ เป็นทางการ, สละสลวย, ทันสมัย และน่าอ่าน 
(ใช้ Tone แบบ ข้าราชการยุคใหม่ แต่ยังคงความน่าเชื่อถือ)

โครงสร้างข่าว:
1. พาดหัวข่าว: สั้น กระชับ ดึงดูด (มี Emoji ได้นิดหน่อย)
2. เนื้อหา: ใคร ทำอะไร ที่ไหน เมื่อไหร่ อย่างไร (บรรยายบรรยากาศให้ดูดี)
3. การปฏิบัติหน้าที่: เน้นย้ำบทบาทของผู้บริหารและเจ้าหน้าที่
4. แฮชแท็ก: #สำนักงานที่ดินจังหวัดนครพนม #กรมที่ดิน #กระทรวงมหาดไทย #บำบัดทุกข์บำรุงสุข

ข้อมูล input จะเป็น JSON
`;

// --- Routes ---

// 1. Extract Data from Image
app.post('/api/extract', upload.single('data'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded' });
        }

        // Get settings from database
        const settings = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM settings WHERE id = 1', (err, row) => {
                if (err) reject(err);
                else resolve(row || { ai_model: 'gemini-1.5-flash', extraction_prompt: EXTRACTION_PROMPT });
            });
        });

        const model = genAI.getGenerativeModel({ model: settings.ai_model });
        const imagePart = fileToGenerativePart(req.file.buffer, req.file.mimetype);
        const prompt = settings.extraction_prompt || EXTRACTION_PROMPT;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Clean JSON
        let jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        res.json(data);

    } catch (error) {
        console.error('Extract Error:', error);
        res.status(500).json({ error: error.message, details: 'Failed to process image' });
    }
});

// 2. Extract Data from Text
app.post('/api/extract-text', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'No text provided' });

        // Get settings from database
        const settings = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM settings WHERE id = 1', (err, row) => {
                if (err) reject(err);
                else resolve(row || { ai_model: 'gemini-1.5-flash', extraction_prompt: EXTRACTION_PROMPT });
            });
        });

        const model = genAI.getGenerativeModel({ model: settings.ai_model });
        const prompt = settings.extraction_prompt || EXTRACTION_PROMPT;
        const result = await model.generateContent([prompt, `ข้อมูล input:\n${text}`]);
        const response = await result.response;

        let jsonStr = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        res.json(data);

    } catch (error) {
        console.error('Extract Text Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Generate News
app.post('/api/generate', async (req, res) => {
    try {
        const data = req.body;

        // Get settings from database
        const settings = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM settings WHERE id = 1', (err, row) => {
                if (err) reject(err);
                else resolve(row || { ai_model: 'gemini-1.5-flash', generation_prompt: GENERATION_PROMPT });
            });
        });

        const model = genAI.getGenerativeModel({ model: settings.ai_model });
        const prompt = settings.generation_prompt || GENERATION_PROMPT;
        const inputPrompt = `ข้อมูลสำหรับเขียนข่าว:\n${JSON.stringify(data, null, 2)}`;

        const result = await model.generateContent([prompt, inputPrompt]);
        const response = await result.response;
        const newsContent = response.text();

        res.json({ news: newsContent });

    } catch (error) {
        console.error('Generate Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Get News History
app.get('/api/news', (req, res) => {
    db.all('SELECT * FROM news ORDER BY created_at DESC LIMIT 50', [], (err, rows) => {
        if (err) {
            console.error('DB Error:', err);
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// 5. Save News
app.post('/api/save-news', (req, res) => {
    const { title, content, summary, source_url, tags } = req.body;

    const query = `
        INSERT INTO news (title, content, summary, source_url, tags)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.run(query, [title, content, summary, source_url, tags], function (err) {
        if (err) {
            console.error('Save Error:', err);
            res.status(500).json({ error: err.message });
        } else {
            // Fetch the inserted row
            db.get('SELECT * FROM news WHERE id = ?', [this.lastID], (err, row) => {
                res.json(row);
            });
        }
    });
});

// 6. Update News
app.post('/api/update-news', (req, res) => {
    const { id, title, content, summary } = req.body;
    const query = `
        UPDATE news 
        SET title = ?, content = ?, summary = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    db.run(query, [title, content, summary, id], function (err) {
        if (err) {
            console.error('Update Error:', err);
            res.status(500).json({ error: err.message });
        } else {
            db.get('SELECT * FROM news WHERE id = ?', [id], (err, row) => {
                res.json(row || { success: true });
            });
        }
    });
});

// 7. Delete News
app.post('/api/delete-news', (req, res) => {
    const { id } = req.body;
    db.run('DELETE FROM news WHERE id = ?', [id], function (err) {
        if (err) {
            console.error('Delete Error:', err);
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: true, id });
        }
    });
});

// 8. Get Settings
app.get('/api/settings', (req, res) => {
    db.get('SELECT * FROM settings WHERE id = 1', (err, row) => {
        if (err) {
            console.error('Settings Error:', err);
            res.status(500).json({ error: err.message });
        } else {
            res.json(row || {});
        }
    });
});

// 9. Update Settings
app.post('/api/settings', (req, res) => {
    const { ai_model, extraction_prompt, generation_prompt, max_news_history, organization_name, presidents_list, participants_list } = req.body;

    const query = `
        UPDATE settings 
        SET ai_model = ?, 
            extraction_prompt = ?, 
            generation_prompt = ?, 
            max_news_history = ?,
            organization_name = ?,
            presidents_list = ?,
            participants_list = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
    `;

    db.run(query, [ai_model, extraction_prompt, generation_prompt, max_news_history, organization_name, presidents_list, participants_list], function (err) {
        if (err) {
            console.error('Update Settings Error:', err);
            res.status(500).json({ error: err.message });
        } else {
            db.get('SELECT * FROM settings WHERE id = 1', (err, row) => {
                res.json(row || { success: true });
            });
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
