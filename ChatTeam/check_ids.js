const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Lấy tất cả thuộc tính id="..."
const idRegex = /id=["']([^"']+)["']/g;
const idsHtml = new Set();
let match;
while ((match = idRegex.exec(html)) !== null) {
  idsHtml.add(match[1]);
}

// Tìm thẻ script cuối cùng (chứa logic)
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const script = scripts[scripts.length - 1][1];

// Lấy tất cả getElementById('...')
const getRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
const missing = new Set();
while ((match = getRegex.exec(script)) !== null) {
  const id = match[1];
  if (!idsHtml.has(id)) {
    missing.add(id);
  }
}

console.log(Array.from(missing).join(', '));
