const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Helper: Read database safely
function readDatabase() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading database.json:', err);
    return [];
  }
}

// Helper: Write database safely
function writeDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing database.json:', err);
    return false;
  }
}

// REST API Endpoints
// Health check for Railway
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'LMT Training Platform Backend',
    platform: 'Railway & GitHub Sync',
    timestamp: new Date().toISOString()
  });
});

// GET /api/leads - Lấy toàn bộ danh sách khách hàng đã đăng ký
app.get('/api/leads', (req, res) => {
  const leads = readDatabase();
  res.json({
    success: true,
    total: leads.length,
    data: leads
  });
});

// POST /api/leads - Ghi nhận khách hàng đăng ký tư vấn mới
app.post('/api/leads', (req, res) => {
  const { fullName, company, phone, email, course, headcount, notes } = req.body;

  if (!fullName || !phone) {
    return res.status(400).json({
      success: false,
      message: 'Họ tên và số điện thoại là bắt buộc.'
    });
  }

  const leads = readDatabase();
  const nextIdNum = leads.length + 1;
  const newLead = {
    id: `LMT-LEAD-${String(nextIdNum).padStart(3, '0')}`,
    fullName: String(fullName).trim(),
    company: company ? String(company).trim() : 'Cá nhân / Doanh nghiệp',
    phone: String(phone).trim(),
    email: email ? String(email).trim() : '',
    course: course ? String(course).trim() : 'Tư vấn tổng quát',
    headcount: headcount ? Number(headcount) : 10,
    notes: notes ? String(notes).trim() : '',
    createdAt: new Date().toISOString(),
    status: 'Chờ tư vấn'
  };

  leads.unshift(newLead); // Thêm lên đầu danh sách
  const saved = writeDatabase(leads);

  if (saved) {
    console.log(`[LMT NEW LEAD] Đã lưu thành công lead: ${newLead.id} - ${newLead.fullName} (${newLead.phone})`);
    return res.status(201).json({
      success: true,
      message: 'Ghi nhận thông tin tư vấn thành công!',
      data: newLead
    });
  } else {
    return res.status(500).json({
      success: false,
      message: 'Không thể ghi dữ liệu vào database.json trên máy chủ.'
    });
  }
});

// GET /api/stats - Thống kê tổng quan cho Admin
app.get('/api/stats', (req, res) => {
  const leads = readDatabase();
  const courseCounts = {};
  leads.forEach(l => {
    courseCounts[l.course] = (courseCounts[l.course] || 0) + 1;
  });

  res.json({
    success: true,
    totalLeads: leads.length,
    courseDistribution: courseCounts,
    lastLead: leads[0] || null
  });
});

// Root fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 LMT Training Server đang chạy trên port: ${PORT}`);
  console.log(`🌐 Website & API: http://localhost:${PORT}`);
  console.log(`📂 Database file: ${DB_FILE}`);
  console.log(`====================================================`);
});
