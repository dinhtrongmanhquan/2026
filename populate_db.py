import sqlite3
import os

db_path = 'database.sqlite'

def setup_database():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Xóa và tạo lại bảng products để đồng bộ
    cursor.execute('DROP TABLE IF EXISTS products')
    cursor.execute('''
        CREATE TABLE products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            image TEXT,
            category TEXT,
            stock INTEGER DEFAULT 0,
            description TEXT
        )
    ''')

    # Thêm dữ liệu từ file SQL (đã chuyển đổi sang SQLite)
    categories = ['Laptop', 'PC', 'Monitor', 'Keyboard', 'Mouse']
    products_to_insert = []

    # Tạo 100 sản phẩm theo logic của bạn
    for i in range(1, 101):
        if i <= 20: category = 'Laptop'
        elif i <= 40: category = 'PC'
        elif i <= 60: category = 'Monitor'
        elif i <= 80: category = 'Keyboard'
        else: category = 'Mouse'
        
        products_to_insert.append((
            f'Sản phẩm {i}',
            1000000 + (i * 100000),
            f'https://picsum.photos/seed/{i}/400/300', # Dùng ảnh tạm thời đẹp hơn
            category,
            10 + (i % 10),
            f'Mô tả chi tiết cho sản phẩm {i}. Hàng chính hãng 2026_!'
        ))

    # Thêm các sản phẩm cụ thể từ phần INSERT INTO của bạn
    # (Tôi lấy một vài mẫu tiêu biểu)
    custom_products = [
        ('Laptop Gaming Pro', 25000000, 'https://picsum.photos/seed/lp1/400/300', 'Laptop', 10, 'Cấu hình cực mạnh'),
        ('PC Master Race', 45000000, 'https://picsum.photos/seed/pc1/400/300', 'PC', 5, 'Siêu phẩm gaming'),
    ]
    
    cursor.executemany('INSERT INTO products (name, price, image, category, stock, description) VALUES (?, ?, ?, ?, ?, ?)', products_to_insert)
    cursor.executemany('INSERT INTO products (name, price, image, category, stock, description) VALUES (?, ?, ?, ?, ?, ?)', custom_products)

    conn.commit()
    conn.close()
    print("Loaded 100+ products successfully into SQLite!")

if __name__ == '__main__':
    setup_database()
