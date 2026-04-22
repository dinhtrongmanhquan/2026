const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
db.run("INSERT OR REPLACE INTO users (email, password, name, avatar, joined_date) VALUES ('admin@2026.com', '123456', 'Super Admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', '2026-04-22')", (err) => {
    if (err) console.error(err.message);
    else console.log('Đã nạp tài khoản Admin thành công!');
    db.close();
});
