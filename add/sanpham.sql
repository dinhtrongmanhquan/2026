-- 1. Tạo bảng Sản phẩm chuẩn SQLite
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price TEXT NOT NULL,
    image TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tạo bảng Người dùng chuẩn SQLite
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    joined_date DATE DEFAULT (DATE('now'))
);

-- 3. Nạp 20 sản phẩm mẫu của bạn
INSERT INTO products (name, price, image, category) VALUES 
('Bàn phím cơ Logitech G Pro', '2.500.000đ', 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=800', 'Bàn phím'),
('Chuột Logitech G502 Hero', '1.100.000đ', 'https://images.unsplash.com/photo-1527814050087-37a3c71cc1a5?q=80&w=800', 'Chuột'),
('Màn hình Dell UltraSharp U2422H', '6.500.000đ', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3496?q=80&w=800', 'Màn hình'),
('Tai nghe HyperX Cloud II', '1.850.000đ', 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=800', 'Tai nghe'),
('Lót chuột SteelSeries QCk', '450.000đ', 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=800', 'Phụ kiện'),
('Bàn phím Keychron K2 V2', '1.950.000đ', 'https://images.unsplash.com/photo-1587829741301-dc798b83dadc?q=80&w=800', 'Bàn phím'),
('Chuột không dây Corsair Harpoon', '850.000đ', 'https://images.unsplash.com/photo-1617396900799-f4ec2b43c7ae?q=80&w=800', 'Chuột'),
('Màn hình Gaming ASUS TUF', '5.200.000đ', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800', 'Màn hình'),
('Tai nghe Sony WH-1000XM5', '8.900.000đ', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800', 'Tai nghe'),
('Webcam Logitech C922 Pro', '2.200.000đ', 'https://images.unsplash.com/photo-1612450866923-d330594a9a5a?q=80&w=800', 'Phụ kiện'),
('Bàn phím Leopold FC900R', '3.200.000đ', 'https://images.unsplash.com/photo-1618384800397-f4412e9c5171?q=80&w=800', 'Bàn phím'),
('Chuột SteelSeries Rival 3', '750.000đ', 'https://images.unsplash.com/photo-1605773527852-c546a8584ea3?q=80&w=800', 'Chuột'),
('Loa Bluetooth Marshall Emberton', '3.800.000đ', 'https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=800', 'Loa'),
('Tay cầm Xbox Series X Controller', '1.450.000đ', 'https://images.unsplash.com/photo-1605906302484-3c582e16013a?q=80&w=800', 'Phụ kiện'),
('SSD Samsung 980 Pro 1TB', '2.800.000đ', 'https://images.unsplash.com/photo-1597872200370-499df5144f64?q=80&w=800', 'Linh kiện'),
('Ram Corsair Vengeance 16GB', '1.550.000đ', 'https://images.unsplash.com/photo-1562976540-1502c2145186?q=80&w=800', 'Linh kiện'),
('Ghế Gaming Secretlab Titan', '12.500.000đ', 'https://images.unsplash.com/photo-1598550476439-6847785fce66?q=80&w=800', 'Ghế'),
('Bàn di chuột Razer Strider', '950.000đ', 'https://images.unsplash.com/photo-1629429408209-1f912961dbd8?q=80&w=800', 'Phụ kiện'),
('Microphone Blue Yeti', '3.200.000đ', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=800', 'Âm thanh'),
('Đèn treo màn hình Baseus', '650.000đ', 'https://images.unsplash.com/photo-1510511459019-5dee99cc0ff3?q=80&w=800', 'Phụ kiện');