async function loadProducts(targetId = 'featured-products', limit = null) {
    const grid = document.getElementById(targetId);
    if (!grid) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryFilter = urlParams.get('category');
        const queryFilter = urlParams.get('q');
        
        let response = await fetch('/api/products');
        let products = await response.json();

        // Lọc theo danh mục
        if (categoryFilter) {
            products = products.filter(p => p.category.toLowerCase() === categoryFilter.toLowerCase());
        }

        // Lọc theo tìm kiếm
        if (queryFilter) {
            products = products.filter(p => p.name.toLowerCase().includes(queryFilter.toLowerCase()));
        }
        
        if (limit) products = products.slice(0, limit);

        if (products.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center py-20 text-gray-500 font-bold uppercase tracking-widest">Không tìm thấy sản phẩm nào</div>';
            return;
        }

        grid.innerHTML = products.map(product => {
            const oldPrice = Math.floor(product.price * 1.2 / 1000) * 1000;
            return `
            <div class="product-card group cursor-pointer" onclick="location.href='/products'">
                <div class="product-image-container">
                    <span class="sale-badge">-20%</span>
                    <img src="${product.image}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500">
                </div>
                <div class="flex flex-col flex-1">
                    <span class="category-label">${product.category}</span>
                    <h4 class="product-title group-hover:text-[var(--accent)] transition-colors">${product.name}</h4>
                    <div class="mt-auto">
                        <div class="flex items-baseline mb-3">
                            <span class="price-new">${product.price.toLocaleString('vi-VN')}đ</span>
                            <span class="price-old">${oldPrice.toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div class="flex items-center text-[10px] text-gray-500 mb-4">
                            <span class="bg-white/5 border border-white/5 px-2 py-1 rounded">Mới 100%</span>
                            <span class="ml-auto">Sẵn hàng</span>
                        </div>
                        <button onclick="event.stopPropagation(); addToCart(${product.id})" class="w-full btn-premium py-2 text-[10px]">Thêm vào giỏ</button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Lỗi khi tải sản phẩm:', error);
    }
}

function addToCart(id) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart.push(id);
    localStorage.setItem('cart', JSON.stringify(cart));
    alert('Đã thêm vào giỏ hàng!');
}

function initSearch() {
    const searchInput = document.getElementById('main-search');
    const searchBtn = document.getElementById('search-btn');

    const doSearch = () => {
        const q = searchInput.value.trim();
        if (q) {
            window.location.href = `/products?q=${encodeURIComponent(q)}`;
        }
    };

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') doSearch();
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', doSearch);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Nếu đang ở trang chủ, chỉ hiện 6 sản phẩm. Nếu ở trang products, hiện hết.
    const isProductsPage = window.location.pathname.includes('/products');
    loadProducts('featured-products', isProductsPage ? null : 6);
    initSearch();
});
