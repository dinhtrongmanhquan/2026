const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.sqlite');

app.use(cors());
app.use(bodyParser.json());
// Phục vụ các file tĩnh trong cùng thư mục (frontend)
app.use(express.static(__dirname));

// Khởi tạo Database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error('Lỗi kết nối DB:', err.message);
    else console.log('Đã kết nối SQLite database.');
});

// Tạo bảng
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price TEXT,
        image TEXT,
        category TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        password TEXT,
        name TEXT,
        avatar TEXT,
        role TEXT DEFAULT 'user',
        joined TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT,
        total_price TEXT,
        status TEXT DEFAULT 'Đang xử lý',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_email) REFERENCES users(email)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_name TEXT,
        price TEXT,
        quantity INTEGER,
        FOREIGN KEY(order_id) REFERENCES orders(id)
    )`);

    // Chèn dữ liệu mẫu nếu bảng trống
    db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
        if (row.count === 0) {
            const stmt = db.prepare("INSERT INTO products (name, price, image, category) VALUES (?, ?, ?, ?)");
            const defaults = [
                ["Keychron Q1 Pro", "4.200.000đ", "https://images.unsplash.com/photo-1587829741301-dc798b83dadc?q=80&w=800", "Bàn phím"],
                ["Logitech G502 X Plus", "3.800.000đ", "https://images.unsplash.com/photo-1552831388-3f293a6093dc?q=80&w=800", "Chuột"],
                ["Sony WH-1000XM5", "8.500.000đ", "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800", "Tai nghe"]
            ];
            defaults.forEach(p => stmt.run(p));
            stmt.finalize();
        }
    });
});

// --- API SẢN PHẨM ---
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/products', (req, res) => {
    const { name, price, image, category } = req.body;
    db.run("INSERT INTO products (name, price, image, category) VALUES (?, ?, ?, ?)", 
        [name, price, image, category], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.delete('/api/products/:id', (req, res) => {
    db.run("DELETE FROM products WHERE id = ?", req.params.id, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- API AUTHENTICATION ---
app.post('/api/register', (req, res) => {
    const { email, password, name, avatar, role, joined } = req.body;
    const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`;
    const today = new Date().toLocaleDateString('vi-VN');
    
    db.run("INSERT INTO users (email, password, name, avatar, role, joined) VALUES (?, ?, ?, ?, ?, ?)",
        [email, password, name || 'Khách hàng', avatar || defaultAvatar, role || 'user', joined || today],
        (err) => {
            if (err) return res.status(400).json({ error: "Email đã tồn tại!" });
            res.json({ success: true });
        }
    );
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu!" });
        res.json(row);
    });
});

app.post('/api/users/update', (req, res) => {
    const { email, name, avatar } = req.body;
    db.run("UPDATE users SET name = ?, avatar = ? WHERE email = ?", [name, avatar, email], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
            res.json(row);
        });
    });
});

// --- API ĐƠN HÀNG (ORDERS) ---
app.post('/api/orders', (req, res) => {
    const { user_email, total_price, items } = req.body;
    
    db.run("INSERT INTO orders (user_email, total_price) VALUES (?, ?)", [user_email, total_price], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        const orderId = this.lastID;
        const stmt = db.prepare("INSERT INTO order_items (order_id, product_name, price, quantity) VALUES (?, ?, ?, ?)");
        
        items.forEach(item => {
            stmt.run([orderId, item.name, item.price, item.quantity]);
        });
        
        stmt.finalize();
        res.json({ success: true, orderId });
    });
});

app.get('/api/orders/:email', (req, res) => {
    db.all(`
        SELECT o.*, GROUP_CONCAT(oi.product_name || ' (x' || oi.quantity || ')') as details
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_email = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
    `, [req.params.email], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
