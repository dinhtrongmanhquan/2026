// ==========================================
// CẤU HÌNH API & SESSION
// ==========================================
const API_URL = 'http://localhost:3000/api';
const SESSION_KEY = '2026_CURRENT_USER';
const CART_KEY = '2026_CART';

// ==========================================
// AUTHENTICATION LOGIC (SQL)
// ==========================================
async function register(email, password) {
    const newUser = {
        email, password,
        name: email.split('@')[0],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
        joined: new Date().toLocaleDateString('vi-VN')
    };
    const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
    });
    return res.ok;
}

async function login(email, password) {
    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (res.ok) {
        const user = await res.json();
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return true;
    }
    return false;
}

function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
}

function checkAuth() {
    if (!getCurrentUser()) window.location.href = 'login.html';
}

// ==========================================
// DATA LOGIC (SQL)
// ==========================================
async function getProducts() {
    try {
        const res = await fetch(`${API_URL}/products`);
        return await res.json();
    } catch (e) {
        return [];
    }
}

async function addProduct(name, price, image, category) {
    const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price, image, category })
    });
    return res.ok;
}

async function deleteProduct(id) {
    const res = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
    return res.ok;
}

// ==========================================
// CART LOGIC
// ==========================================
function getCart() {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
}

function addToCart(product) {
    if (!getCurrentUser()) {
        alert("Vui lòng đăng nhập để mua sắm tại 2026_!");
        window.location.href = 'user-login.html';
        return;
    }
    
    let cart = getCart();
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
    alert('Đã thêm "' + product.name + '" vào giỏ hàng!');
}

function buyNow(product) {
    if (!getCurrentUser()) {
        alert("Vui lòng đăng nhập để mua sắm tại 2026_!");
        window.location.href = 'user-login.html';
        return;
    }
    
    let cart = getCart();
    const existing = cart.find(i => i.id === product.id);
    if (!existing) {
        cart.push({ ...product, quantity: 1 });
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }
    window.location.href = 'cart.html';
}

function updateCartBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    const cart = getCart();
    const total = cart.reduce((acc, item) => acc + item.quantity, 0);
    badge.innerText = total;
    badge.style.display = total > 0 ? 'flex' : 'none';
}

// ==========================================
// RENDER LOGIC
// ==========================================
function updateNavUI() {
    const user = getCurrentUser();
    const navAuth = document.getElementById('nav-auth');
    if (!navAuth || !user) return;

    navAuth.innerHTML = `
        <button onclick="window.location.href='cart.html'" class="relative p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group">
            <svg class="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
            <span id="cart-count" class="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-950">0</span>
        </button>
        <div onclick="window.location.href='profile.html'" class="flex items-center space-x-3 cursor-pointer group pl-1 pr-5 py-1 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all">
            <div class="relative">
                <img src="${user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.email}" class="w-10 h-10 rounded-xl border border-white/20 shadow-2xl object-cover">
                <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-950"></div>
            </div>
            <div class="flex flex-col">
                <span class="text-[10px] font-black text-white group-hover:text-cyan-400 transition-colors uppercase tracking-widest">${user.name.split(' ').pop()}</span>
                <span class="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Premium Member</span>
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', async () => {
    updateNavUI();
    updateCartBadge();
    
    const items = await getProducts();
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q')?.toLowerCase() || '';
    const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '';

    if (document.getElementById('product-grid')) {
        let displayItems = items;
        if (query) {
            displayItems = items.filter(item => 
                item.name.toLowerCase().includes(query) || 
                item.category.toLowerCase().includes(query)
            );
            const title = document.querySelector('h2');
            if (title && !isIndex) title.innerHTML = `Kết quả cho <span class="gradient-text">"${urlParams.get('q')}"</span>`;
        }
        if (isIndex) displayItems = displayItems.slice(0, 4);
        renderProductGrid(displayItems);
    }

    if (document.getElementById('product-detail-container')) renderProductDetail(items);
    if (document.getElementById('category-grid')) renderCategoryPage(items);
});

function renderProductGrid(items) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    // Lưu items vào biến toàn cục một cách an toàn
    if (!window.allProducts) window.allProducts = [];
    items.forEach(i => {
        if (!window.allProducts.find(p => p.id === i.id)) {
            window.allProducts.push(i);
        }
    });
    
    grid.innerHTML = items.map(item => `
        <div class="product-card group bg-white/5 p-5 rounded-[2.5rem] border border-white/5 hover:border-cyan-500/50 transition-all flex flex-col h-full hover:bg-white/10 shadow-xl relative">
            <div class="overflow-hidden rounded-3xl mb-6 bg-slate-950 aspect-square relative cursor-pointer z-10" onclick="goToProduct(${item.id})">
                <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
                <div class="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    <span class="text-[9px] font-black uppercase tracking-widest text-cyan-400">${item.category}</span>
                </div>
            </div>
            <div class="px-2 flex-grow z-10">
                <h3 class="text-lg font-bold mb-2 group-hover:text-cyan-400 cursor-pointer line-clamp-1 transition-colors" onclick="goToProduct(${item.id})">${item.name}</h3>
                <p class="text-2xl font-black gradient-text mb-6">${item.price.toLocaleString('vi-VN')}đ</p>
            </div>
            <div class="flex gap-2 mt-auto relative z-20 pointer-events-auto">
                <button type="button" onclick="event.preventDefault(); event.stopPropagation(); handleCartClick(${item.id})" class="flex-1 py-4 bg-white/5 hover:bg-white/20 border border-white/10 rounded-2xl transition-all flex items-center justify-center group/btn cursor-pointer">
                    <svg class="w-5 h-5 text-slate-400 group-hover/btn:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                </button>
                <button type="button" onclick="event.preventDefault(); event.stopPropagation(); handleBuyNowClick(${item.id})" class="flex-[3] py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-[0_10px_20px_rgba(6,182,212,0.3)] cursor-pointer">
                    Mua ngay
                </button>
            </div>
        </div>
    `).join('');
}

// Hàm bổ trợ để xử lý click chuẩn xác
function handleCartClick(id) {
    console.log("Adding to cart: ", id);
    const product = window.allProducts.find(p => p.id === Number(id) || p.id == id);
    if (product) addToCart(product);
    else alert("Không tìm thấy sản phẩm!");
}

function handleBuyNowClick(id) {
    console.log("Buying now: ", id);
    const product = window.allProducts.find(p => p.id === Number(id) || p.id == id);
    if (product) buyNow(product);
    else alert("Không tìm thấy sản phẩm!");
}

function goToProduct(id) {
    window.location.href = `product.html?id=${id}`;
}

function searchProduct(event) {
    if (event.key === 'Enter') {
        const query = event.target.value.trim();
        if (query) window.location.href = `products.html?q=${encodeURIComponent(query)}`;
    }
}

function renderProductDetail(items) {
    const container = document.getElementById('product-detail-container');
    if (!container) return;
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id'));
    const product = items.find(p => p.id === productId) || items[0];

    if (!product) {
        container.innerHTML = `<h2 class="text-white text-2xl">Không tìm thấy sản phẩm.</h2>`;
        return;
    }

    document.title = `${product.name} | 2026_!`;
    container.innerHTML = `
        <div class="lg:w-1/2 bg-white/5 p-6 rounded-[3rem] border border-white/10">
            <img src="${product.image}" class="w-full rounded-[2.5rem] shadow-2xl">
        </div>
        <div class="lg:w-1/2">
            <span class="text-cyan-400 text-xs font-black uppercase tracking-widest mb-4 block">${product.category}</span>
            <h2 class="text-5xl md:text-7xl font-black mb-8 text-white leading-tight uppercase">${product.name}</h2>
            <p class="text-slate-400 text-lg mb-10 leading-relaxed">
                Khám phá siêu phẩm ${product.name} phân phối chính hãng bởi 2026_!. Trải nghiệm hiệu năng vượt trội và thiết kế đẳng cấp dẫn đầu xu hướng.
            </p>
            <div class="text-5xl font-black gradient-text mb-12">${product.price}</div>
            <div class="flex flex-col sm:flex-row gap-4">
                <button onclick='addToCart(${JSON.stringify(product).replace(/'/g, "&apos;")})' class="btn-premium px-12 py-5 flex-1">Thêm vào giỏ</button>
                <button onclick='buyNow(${JSON.stringify(product).replace(/'/g, "&apos;")})' class="px-12 py-5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors flex-1 text-sm font-bold uppercase">Mua ngay</button>
            </div>
        </div>
    `;
}

function renderCategoryPage(items) {
    const grid = document.getElementById('category-grid');
    const title = document.getElementById('category-title');
    if (!grid) return;
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    
    if (!type) {
        grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12";
        title.innerHTML = `Tất cả <span class="gradient-text">Danh mục</span>`;
        const cats = [
            { name: 'Bàn phím', img: 'https://images.unsplash.com/photo-1587829741301-dc798b83dadc?q=80&w=800', desc: 'Mechanical Keyboards' },
            { name: 'Chuột', img: 'https://images.unsplash.com/photo-1617396900799-f4ec2b43c7ae?q=80&w=800', desc: 'Gaming Mice' },
            { name: 'Tai nghe', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800', desc: 'Hi-Fi Audio' }
        ];
        grid.innerHTML = cats.map(cat => `
            <div class="group relative h-[450px] rounded-[3rem] overflow-hidden border border-white/10 cursor-pointer" onclick="window.location.href='category.html?type=${cat.name}'">
                <img src="${cat.img}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                <div class="absolute bottom-10 left-10 right-10">
                    <h4 class="text-4xl font-black mb-4 uppercase">${cat.name}</h4>
                    <p class="text-slate-400 text-sm mb-6 opacity-0 group-hover:opacity-100 transition-opacity">${cat.desc}</p>
                    <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black group-hover:bg-cyan-400 transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                    </div>
                </div>
            </div>
        `).join('');
        return;
    }
    
    grid.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12";
    title.innerHTML = `${type} <span class="gradient-text">CAO CẤP</span>`;
    const filtered = items.filter(item => item.category === type);
    grid.innerHTML = filtered.length ? filtered.map(item => `
        <div class="product-card group cursor-pointer bg-white/5 p-4 rounded-[2rem] border border-white/5 hover:border-cyan-500/50 transition-all" onclick="goToProduct(${item.id})">
            <div class="overflow-hidden rounded-2xl mb-6 bg-slate-950 aspect-square">
                <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
            </div>
            <h3 class="text-xl font-bold mb-2 group-hover:text-cyan-400">${item.name}</h3>
            <div class="flex justify-between items-center mt-4">
                <span class="text-xl font-black text-white">${item.price}</span>
                <span class="text-[10px] text-cyan-400 font-black uppercase tracking-widest px-2 py-1 bg-cyan-400/10 rounded">${item.category}</span>
            </div>
        </div>
    `).join('') : `<div class="col-span-full py-20 text-center text-slate-500">Trống.</div>`;
}

// SLIDER
let cur = 0;
setInterval(() => {
    const s = document.getElementById('poster-slider');
    if (s) { cur = (cur + 1) % 2; s.style.transform = `translateX(-${cur * 100}%)`; }
}, 5000);
