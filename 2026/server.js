const http = require('http');
const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, 'database.json');

// Tạo file database.json mặc định nếu chưa có
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, JSON.stringify({
    users: [],
    messages: {},
    presence: {},
    friends: {},
    requests: {},
    groups: {},
    posts: [],
    stories: []
  }, null, 2));
}

const server = http.createServer((req, res) => {
  // Cấu hình CORS để trình duyệt không chặn
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Đọc dữ liệu
  if (req.method === 'GET' && url.pathname === '/api/get') {
    const key = url.searchParams.get('path');
    try {
      const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(key ? (data[key] || null) : data));
    } catch (e) {
      res.writeHead(500); res.end('Lỗi đọc Database');
    }
  }
  // Ghi dữ liệu
  else if (req.method === 'POST' && url.pathname === '/api/set') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const { path, data } = JSON.parse(body);
        const dbData = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        dbData[path] = data; // Cập nhật đúng phần cần thay đổi
        fs.writeFileSync(dbFile, JSON.stringify(dbData, null, 2)); // Ghi vào file
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500); res.end('Lỗi ghi Database');
      }
    });
  }
  else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`\n==============================================`);
  console.log(`🚀 DATABASE SERVER ĐANG CHẠY TẠI PORT: ${PORT}`);
  console.log(`📁 File Database: ${dbFile}`);
  console.log(`⚠️  Vui lòng KHÔNG ĐÓNG cửa sổ này để Web hoạt động!`);
  console.log(`==============================================\n`);
});
