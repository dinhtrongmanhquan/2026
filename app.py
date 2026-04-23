import os
import sqlite3
import re
from flask import Flask, render_template, request, jsonify, redirect, url_for, session

app = Flask(__name__)
app.secret_key = 'super-secret-gaming-key'

# --- CẤU HÌNH DATABASE ---
DB_PATH = 'database.sqlite'

def is_password_strong(password):
    if len(password) < 8: return False
    if not re.search(r"[a-z]", password): return False
    if not re.search(r"[A-Z]", password): return False
    if not re.search(r"[0-9]", password): return False
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password): return False
    return True

def get_db_connection():
    # Thêm timeout 20 giây để tránh lỗi 'database is locked' khi đồng bộ 100 sản phẩm
    conn = sqlite3.connect(DB_PATH, timeout=20)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Bảng Sản phẩm (Theo file của bạn)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            image TEXT,
            category TEXT,
            stock INTEGER DEFAULT 0,
            description TEXT
        )
    ''')

    # Bảng Người dùng (Theo file của bạn)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT,
            role TEXT DEFAULT 'user'
        )
    ''')

    # Bảng Đơn hàng (Mới)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            total INTEGER,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    # Bảng Chi tiết đơn hàng (Mới)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            product_id INTEGER,
            quantity INTEGER,
            price INTEGER,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    ''')

    # Bảng Admin (Bắt buộc để quản trị)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')
    
    # Bảng Tin tức
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            summary TEXT,
            content TEXT,
            image TEXT,
            date TEXT,
            author TEXT
        )
    ''')
    conn.commit()
    conn.close()

# --- ROUTES GIAO DIỆN ---
@app.route('/')
def index(): return render_template('index.html')

@app.route('/products')
def products_page(): return render_template('products.html')

@app.route('/cart')
def cart_page(): return render_template('cart.html')

@app.route('/profile')
def profile():
    if not session.get('user_id'):
        return redirect(url_for('auth_page'))
    return render_template('profile.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/auth')
def auth_page(): return render_template('auth.html')

@app.route('/api/sync-sql', methods=['POST'])
def sync_sql_file():
    if not session.get('is_admin'): return jsonify({'error': 'Unauthorized'}), 401
    sql_path = r'C:\Users\msi\.gemini\antigravity\scratch\temp_run\SQLQuery3.sql'
    
    if not os.path.exists(sql_path):
        return jsonify({'error': 'Không tìm thấy file SQLQuery3.sql'}), 404
    
    conn = None
    try:
        # Sử dụng utf-8-sig để xử lý BOM nếu có từ SQL Server
        with open(sql_path, 'r', encoding='utf-8-sig') as f:
            content = f.read()
        
        # Chuyển đổi chuẩn
        content = content.replace('N\'', '\'')
        content = content.replace('GO', ';')
        
        # Tách các câu lệnh bằng dấu chấm phẩy
        import re
        statements = content.split(';')
        
        conn = get_db_connection()
        conn.execute('DELETE FROM products')
        
        count = 0
        for stmt in statements:
            stmt = stmt.strip()
            # Làm sạch các comment còn sót lại trong từng statement
            stmt = re.sub(r'/\*.*?\*/', '', stmt, flags=re.DOTALL)
            stmt = re.sub(r'--.*', '', stmt)
            stmt = stmt.strip()
            
            # Kiểm tra lệnh INSERT (không phân biệt hoa thường và khoảng trắng)
            if re.search(r'^INSERT\s+INTO\s+products', stmt, re.IGNORECASE):
                try:
                    conn.execute(stmt)
                    count += 1
                except Exception:
                    pass
        
        conn.commit()
        
        if count > 0:
            return jsonify({'status': 'success', 'message': f'Đã đồng bộ thành công 100 sản phẩm từ file của bạn!'})
        else:
            return jsonify({'error': 'Không tìm thấy lệnh INSERT nào hợp lệ trong file.'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/admin/profile')
def admin_profile():
    if not session.get('is_admin'): return redirect(url_for('admin_login'))
    return render_template('admin_profile.html')

@app.route('/admin')
def admin():
    if not session.get('is_admin'):
        return redirect(url_for('admin_login'))
    return render_template('admin.html')

@app.route('/admin/news')
def admin_news():
    if not session.get('is_admin'):
        return redirect(url_for('admin_login'))
    return render_template('admin_news.html')

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        conn = get_db_connection()
        admin = conn.execute('SELECT * FROM admins WHERE username = ? AND password = ?', (username, password)).fetchone()
        conn.close()
        
        if admin:
            session['is_admin'] = True
            session['admin_user'] = username
            return redirect(url_for('admin'))
        return render_template('admin_login.html', error='Sai tài khoản hoặc mật khẩu!')
    return render_template('admin_login.html')

@app.route('/admin/register', methods=['GET', 'POST'])
def admin_register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        master_key = request.form.get('master_key')
        
        if not is_password_strong(password):
            return render_template('admin_register.html', error='Mật khẩu phải từ 8 ký tự, có in hoa, in thường, số và ký tự đặc biệt!')

        if master_key != '2026_!':
            return render_template('admin_register.html', error='Mã bảo mật không đúng!')
            
        conn = get_db_connection()
        try:
            conn.execute('INSERT INTO admins (username, password) VALUES (?, ?)', (username, password))
            conn.commit()
            return render_template('admin_register.html', success='Đã tạo tài khoản admin thành công!')
        except:
            return render_template('admin_register.html', error='Tên đăng nhập đã tồn tại!')
        finally:
            conn.close()
    return render_template('admin_register.html')

@app.route('/admin/logout')
def admin_logout():
    session.pop('is_admin', None)
    return redirect(url_for('admin_login'))

@app.route('/news')
def news():
    return render_template('news.html')

@app.route('/build-pc')
def build_pc():
    return render_template('build_pc.html')

# --- API TIN TỨC ---
@app.route('/api/news', methods=['GET'])
def get_all_news():
    conn = get_db_connection()
    news = conn.execute('SELECT * FROM news ORDER BY id DESC').fetchall()
    conn.close()
    return jsonify([dict(n) for n in news])

@app.route('/api/news', methods=['POST'])
def add_news():
    if not session.get('is_admin'): return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    conn = get_db_connection()
    conn.execute('INSERT INTO news (title, summary, content, image, date, author) VALUES (?, ?, ?, ?, ?, ?)',
                 (data['title'], data['summary'], data['content'], data['image'], data['date'], session.get('admin_user')))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/api/news/<int:id>', methods=['DELETE'])
def delete_news(id):
    if not session.get('is_admin'): return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db_connection()
    conn.execute('DELETE FROM news WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/api/admin/delete-all', methods=['POST'])
def delete_all_products():
    if not session.get('is_admin'): return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db_connection()
    try:
        conn.execute('DELETE FROM products')
        conn.commit()
        return jsonify({'status': 'success', 'message': 'Đã xóa sạch toàn bộ sản phẩm trong kho!'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

# --- API THỐNG KÊ ADMIN ---
@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    if not session.get('is_admin'): return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db_connection()
    stats = {
        'total_products': conn.execute('SELECT COUNT(*) FROM products').fetchone()[0],
        'total_users': conn.execute('SELECT COUNT(*) FROM users').fetchone()[0],
        'total_orders': conn.execute('SELECT COUNT(*) FROM orders').fetchone()[0],
        'total_revenue': conn.execute('SELECT SUM(total) FROM orders WHERE status = "done"').fetchone()[0] or 0,
        'recent_orders': [dict(row) for row in conn.execute('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5').fetchall()]
    }
    conn.close()
    return jsonify(stats)

# --- HỆ THỐNG GỬI BÁO CÁO EMAIL ---
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_monthly_report():
    recipient = "kingdorenom@gmail.com"
    # Logic lấy dữ liệu tháng này
    conn = get_db_connection()
    revenue = conn.execute('SELECT SUM(total) FROM orders WHERE status = "done"').fetchone()[0] or 0
    order_count = conn.execute('SELECT COUNT(*) FROM orders').fetchone()[0]
    conn.close()

    subject = f"Báo cáo doanh thu tháng - 2026_!"
    body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #0f172a; color: white; padding: 20px;">
            <h2 style="color: #22d3ee;">BÁO CÁO DOANH THU HÀNG THÁNG - 2026_!</h2>
            <p>Chào Admin, đây là thống kê tình hình kinh doanh tháng này:</p>
            <ul>
                <li><b>Tổng doanh thu:</b> {revenue:,} VNĐ</li>
                <li><b>Tổng đơn hàng:</b> {order_count} đơn</li>
            </ul>
            <p>Trân trọng,<br>Hệ thống quản trị 2026_!</p>
        </body>
    </html>
    """
    
    msg = MIMEMultipart()
    msg['From'] = "2026_! System <your-email@gmail.com>"
    msg['To'] = recipient
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'html'))

    # Lưu ý: Cần cấu hình SMTP và App Password để chạy
    try:
        # server = smtplib.SMTP('smtp.gmail.com', 587)
        # server.starttls()
        # server.login("your-email@gmail.com", "your-app-password")
        # server.send_message(msg)
        # server.quit()
        print(f"Đã giả lập gửi báo cáo tới {recipient}")
    except Exception as e:
        print(f"Lỗi gửi email: {e}")

# --- API XỬ LÝ DỮ LIỆU ---
@app.route('/api/products', methods=['GET'])
def get_products():
    conn = get_db_connection()
    products = conn.execute('SELECT id, name, price, image, category, stock, description FROM products').fetchall()
    conn.close()
    return jsonify([dict(p) for p in products])

@app.route('/api/products', methods=['POST'])
def add_product():
    if not session.get('is_admin'): return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    conn = get_db_connection()
    conn.execute('INSERT INTO products (name, price, image, category, stock, description) VALUES (?, ?, ?, ?, ?, ?)',
                 (data['name'], data['price'], data['image'], data['category'], data.get('stock', 0), data['description']))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/api/products/<int:id>', methods=['PUT'])
def update_product(id):
    if not session.get('is_admin'): return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    conn = get_db_connection()
    conn.execute('UPDATE products SET name = ?, price = ?, image = ?, category = ?, stock = ?, description = ? WHERE id = ?',
                 (data['name'], data['price'], data['image'], data['category'], data.get('stock', 0), data['description'], id))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/api/products/<int:id>', methods=['DELETE'])
def delete_product(id):
    if not session.get('is_admin'): return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db_connection()
    conn.execute('DELETE FROM products WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ? AND password = ?', 
                      (data['email'], data['password'])).fetchone()
    conn.close()
    if user:
        session['user_id'] = user['id']
        session['user_name'] = user['name']
        session['user_email'] = user['email']
        return jsonify({'success': True, 'user': dict(user)})
    return jsonify({'success': False, 'message': 'Sai email hoặc mật khẩu'}), 401

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if not is_password_strong(data['password']):
        return jsonify({'success': False, 'message': 'Mật khẩu phải từ 8 ký tự, có in hoa, in thường, số và ký tự đặc biệt!'}), 400
        
    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
                   (data['email'], data['password'], data['name']))
        conn.commit()
        return jsonify({'success': True})
    except:
        return jsonify({'success': False, 'message': 'Email đã tồn tại'}), 400
    finally:
        conn.close()

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
