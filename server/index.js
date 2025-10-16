const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/teacher_attendance';
const TEACHER_ID = process.env.TEACHER_ID || 'teacher1';
const TEACHER_PW = process.env.TEACHER_PW || 'changeme';
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error', err));

// Models
const TeacherSchema = new mongoose.Schema({ teacherId: String, passwordHash: String });
const Teacher = mongoose.model('Teacher', TeacherSchema);

const StudentSchema = new mongoose.Schema({ name: String, roll: String });
const Student = mongoose.model('Student', StudentSchema);

const AttendanceSchema = new mongoose.Schema({
  date: { type: String }, // YYYY-MM-DD
  records: [{ student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' }, present: Boolean }]
});
const Attendance = mongoose.model('Attendance', AttendanceSchema);

const ShareSchema = new mongoose.Schema({ token: String, date: String, createdAt: { type: Date, default: Date.now } });
const Share = mongoose.model('Share', ShareSchema);

// Seed teacher on startup if not exists
async function seedTeacher() {
  const t = await Teacher.findOne({ teacherId: TEACHER_ID });
  if (!t) {
    const hash = await bcrypt.hash(TEACHER_PW, 10);
    await Teacher.create({ teacherId: TEACHER_ID, passwordHash: hash });
    console.log('Seeded teacher:', TEACHER_ID);
  }
}
seedTeacher().catch(console.error);

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing token' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Bad auth format' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.teacher = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Auth
app.post('/api/login', async (req, res) => {
  const { teacherId, password } = req.body;
  const teacher = await Teacher.findOne({ teacherId });
  if (!teacher) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, teacher.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ teacherId }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// Students
app.get('/api/students', authMiddleware, async (req, res) => {
  const students = await Student.find().lean();
  res.json(students);
});

app.post('/api/students', authMiddleware, async (req, res) => {
  const { name, roll } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const s = await Student.create({ name, roll });
  res.status(201).json(s);
});

app.delete('/api/students/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  await Student.findByIdAndDelete(id);
  // remove student from attendance records
  await Attendance.updateMany({}, { $pull: { records: { student: id } } });
  res.json({ ok: true });
});

// list saved dates
app.get('/api/attendance/dates', authMiddleware, async (req, res) => {
  const dates = await Attendance.find().sort({ date: -1 }).select('date -_id').lean();
  res.json(dates.map(d=>d.date));
});

// create share token for a date
app.post('/api/share/:date', authMiddleware, async (req, res) => {
  const date = req.params.date;
  const token = Math.random().toString(36).slice(2,9);
  await Share.create({ token, date });
  res.json({ token, url: `/share/${token}` });
});

// public share view
app.get('/share/:token', async (req, res) => {
  const token = req.params.token;
  const sh = await Share.findOne({ token }).lean();
  if (!sh) return res.status(404).send('Not found');
  const att = await Attendance.findOne({ date: sh.date }).populate('records.student').lean();
  // render a very small HTML view
  const rows = (att?.records || []).map(r=>`<tr><td>${r.student?.name||'Unknown'}</td><td>${r.present? 'Present':'Absent'}</td></tr>`).join('');
  res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Shared attendance ${sh.date}</title></head><body><h2>Attendance ${sh.date}</h2><table border=1><tr><th>Name</th><th>Status</th></tr>${rows}</table></body></html>`)
});

// Attendance
app.get('/api/attendance/:date', authMiddleware, async (req, res) => {
  const date = req.params.date;
  const att = await Attendance.findOne({ date }).populate('records.student').lean();
  if (!att) return res.json({ date, records: [] });
  res.json(att);
});

app.post('/api/attendance/:date', authMiddleware, async (req, res) => {
  const date = req.params.date;
  const { records } = req.body; // [{ student: id, present: true }]
  if (!Array.isArray(records)) return res.status(400).json({ error: 'records array required' });
  let att = await Attendance.findOne({ date });
  if (!att) {
    att = await Attendance.create({ date, records });
  } else {
    att.records = records;
    await att.save();
  }
  res.json(att);
});

const PORT = process.env.PORT || 4000;
// If client build exists, serve it as static files so the app can run from one port
const clientDist = path.join(__dirname, '..', 'client', 'dist');
try {
  const fs = require('fs');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
    console.log('Serving client from', clientDist);
  }
} catch (err) {
  console.error('Error checking client dist', err);
}

app.listen(PORT, () => console.log('Server running on port', PORT));
