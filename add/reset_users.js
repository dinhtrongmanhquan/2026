const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Users/msi/Downloads/abb/database.sqlite');
db.serialize(() => {
    db.run('DROP TABLE IF EXISTS users');
    db.run('CREATE TABLE users (email TEXT PRIMARY KEY, password TEXT, name TEXT, avatar TEXT, role TEXT DEFAULT "user", joined TEXT)');
    db.run("INSERT INTO users (email, password, name, avatar, role, joined) VALUES ('admin@2026.com', '123456', 'Super Admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', 'admin', '22/04/2026')");
    console.log('--- RESET THÀNH CÔNG ---');
    console.log('Tài khoản Admin đã được khôi phục: admin@2026.com / 123456');
});
db.close();
