const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');
const SQL_PATH = path.join(__dirname, 'sanpham.sql');

const db = new sqlite3.Database(DB_PATH);

const sql = `
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS users;
    ${fs.readFileSync(SQL_PATH).toString()}
`;

db.exec(sql, (err) => {
    if (err) {
        console.error('Lỗi khi nạp SQL:', err.message);
    } else {
        console.log('--- THÀNH CÔNG ---');
        console.log('Dữ liệu từ sanpham.sql đã được nạp vào Database!');
    }
    db.close();
});
