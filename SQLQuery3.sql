-- =========================
-- XÓA BẢNG CŨ
-- =========================
IF OBJECT_ID('order_items', 'U') IS NOT NULL DROP TABLE order_items;
IF OBJECT_ID('orders', 'U') IS NOT NULL DROP TABLE orders;
IF OBJECT_ID('products', 'U') IS NOT NULL DROP TABLE products;
IF OBJECT_ID('users', 'U') IS NOT NULL DROP TABLE users;

-- =========================
-- TẠO BẢNG
-- =========================
CREATE TABLE products (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    price INT NOT NULL,
    image NVARCHAR(255),
    category NVARCHAR(100),
    stock INT DEFAULT 0,
    description NVARCHAR(MAX)
);

CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) UNIQUE NOT NULL,
    password NVARCHAR(255) NOT NULL,
    name NVARCHAR(255),
    role NVARCHAR(50) DEFAULT 'user'
);

CREATE TABLE orders (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT,
    total INT,
    status NVARCHAR(50) DEFAULT 'pending',
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT,
    price INT,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- =========================
-- THÊM 100 SẢN PHẨM
-- =========================
DECLARE @i INT = 1;

WHILE @i <= 100
BEGIN
    DECLARE @category NVARCHAR(50);

    IF @i <= 20 SET @category = N'Laptop';
    ELSE IF @i <= 40 SET @category = N'PC';
    ELSE IF @i <= 60 SET @category = N'Monitor';
    ELSE IF @i <= 80 SET @category = N'Keyboard';
    ELSE SET @category = N'Mouse';

    INSERT INTO products (name, price, image, category, stock, description)
    VALUES (
        N'San pham ' + CAST(@i AS NVARCHAR),
        1000000 + (@i * 100000),
        'images/sp' + CAST(@i AS NVARCHAR) + '.jpg',
        @category,
        10 + (@i % 10),
        N'Mo ta san pham ' + CAST(@i AS NVARCHAR)
    );

    SET @i = @i + 1;
END;

-- =========================
-- KIỂM TRA
-- =========================
SELECT COUNT(*) AS TongSanPham FROM products;
SELECT TOP 10 * FROM products;

INSERT INTO products (name, price, image, category, stock, description) VALUES
(N'ASUS ROG Zephyrus G14', 35000000, 'https://dlcdnwebimgs.asus.com/gain/3D8E3D8E-3D8E-3D8E-3D8E-3D8E3D8E3D8E', N'Laptop', 5, N'Laptop gaming 14 inch mạnh nhất'),
(N'MSI Titan GT77', 120000000, 'https://storage-asset.msi.com/global/picture/news/2022/nb/titan-gt77-20220601-1.jpg', N'Laptop', 2, N'Quái vật hiệu năng với RTX 4090'),
(N'Razer Blade 16', 95000000, 'https://assets2.razerzone.com/images/pnx.assets/0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a/razer-blade-16-2023-500x500.png', N'Laptop', 3, N'Đẳng cấp sang trọng và sức mạnh'),
(N'Acer Predator Helios 16', 45000000, 'https://static.acer.com/up/Resource/Acer/Laptops/Predator_Helios_16/Images/20230103/Predator-Helios-16-PH16-71-Preview.png', N'Laptop', 8, N'Tản nhiệt vô đối trong tầm giá'),
(N'Dell Alienware m18', 88000000, 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/alienware-notebooks/alienware-m18-intel/media-gallery/laptop-alienware-m18-nt-gallery-1.psd?fmt=pjpg&pscan=auto&scl=1&wid=4000&hei=2643&qlt=100,0&resMode=sharp2&size=4000,2643', N'Laptop', 4, N'Thiết kế tương lai, màn hình cực đại'),
(N'Gigabyte AORUS 17X', 72000000, 'https://www.gigabyte.com/Image/4d3e8e3d8e3d8e3d8e3d8e3d8e3d8e3d', N'Laptop', 5, N'Hiệu năng chuẩn studio và gaming'),
(N'HP Omen 17', 52000000, 'https://www.hp.com/ca-en/shop/Html/Merch/Images/c08134015_500x500.jpg', N'Laptop', 6, N'Sự tinh tế trong từng đường nét'),
(N'Lenovo Legion 7i Gen 8', 65000000, 'https://p1-ofp.static.pub/medias/bWFzdGVyfHJvb3R8MzEwNzA1fGltYWdlL3BuZ3xoZGMvaGI0LzE3MTI0NTM4OTQ5NjYyLnBuZ3w0YjNlOGUzZDhlM2Q4ZTNkOGUzZDhlM2Q4ZTNkOGUzZA/lenovo-legion-7i-gen-8-16-intel-01.png', N'Laptop', 7, N'Bàn phím tốt nhất trên laptop gaming'),
(N'ASUS TUF Gaming F15', 22000000, 'https://dlcdnwebimgs.asus.com/gain/5d3e8e3d8e3d8e3d8e3d8e3d8e3d8e3d', N'Laptop', 15, N'Độ bền chuẩn quân đội'),
(N'MSI Katana GF66', 19000000, 'https://storage-asset.msi.com/global/picture/news/2021/nb/katana-20210517-1.jpg', N'Laptop', 20, N'Thanh kiếm sắc bén trong phân khúc phổ thông'),
(N'Laptop Gaming 11', 20000000, 'https://picsum.photos/seed/lp11/400/300', N'Laptop', 10, N'Sản phẩm sắp về'),
(N'Laptop Gaming 12', 21000000, 'https://picsum.photos/seed/lp12/400/300', N'Laptop', 10, N'Sản phẩm sắp về'),
(N'Laptop Gaming 13', 22000000, 'https://picsum.photos/seed/lp13/400/300', N'Laptop', 10, N'Sản phẩm sắp về'),
(N'Laptop Gaming 14', 23000000, 'https://picsum.photos/seed/lp14/400/300', N'Laptop', 10, N'Sản phẩm sắp về'),
(N'Laptop Gaming 15', 24000000, 'https://picsum.photos/seed/lp15/400/300', N'Laptop', 10, N'Sản phẩm sắp về'),
(N'Laptop Gaming 16', 25000000, 'https://picsum.photos/seed/lp16/400/300', N'Laptop', 10, N'Sản phẩm sắp về'),
(N'Laptop Gaming 17', 26000000, 'https://picsum.photos/seed/lp17/400/300', N'Laptop', 10, N'Sản phẩm sắp về'),
(N'Laptop Gaming 18', 27000000, 'https://picsum.photos/seed/lp18/400/300', N'Laptop', 10, N'Sản phẩm sắp về'),
(N'Laptop Gaming 19', 28000000, 'https://picsum.photos/seed/lp19/400/300', N'Laptop', 10, N'Sản phẩm sắp về'),
(N'Laptop Gaming 20', 29000000, 'https://picsum.photos/seed/lp20/400/300', N'Laptop', 10, N'Sản phẩm sắp về'),

(N'PC Gaming Ultra White - i9 14900K', 85000000, 'https://picsum.photos/seed/pc1/800/600', N'PC', 2, N'Siêu phẩm PC trắng muốt, sức mạnh tối thượng'),
(N'PC Gaming Black Beast - R9 7950X', 78000000, 'https://picsum.photos/seed/pc2/800/600', N'PC', 3, N'Chiến thần AMD cho mọi tác vụ nặng'),
(N'PC Gaming MSI MEG - i7 13700K', 45000000, 'https://picsum.photos/seed/pc3/800/600', N'PC', 5, N'Đồng bộ hệ sinh thái MSI cao cấp'),
(N'PC Gaming ROG Strix - i5 13600K', 32000000, 'https://picsum.photos/seed/pc4/800/600', N'PC', 8, N'Lựa chọn hoàn hảo cho game thủ tầm trung'),
(N'PC Gaming Starter - i3 12100F', 12000000, 'https://picsum.photos/seed/pc5/800/600', N'PC', 15, N'Khởi đầu đam mê với mức giá cực tốt'),
(N'PC Workstation Dual Xeon', 110000000, 'https://picsum.photos/seed/pc6/800/600', N'PC', 1, N'Cỗ máy render chuyên nghiệp cho studio'),
(N'PC ITX Mini - i7 14700', 38000000, 'https://picsum.photos/seed/pc7/800/600', N'PC', 4, N'Sức mạnh khổng lồ trong thân hình tí hon'),
(N'PC Gaming Corsair iCUE', 55000000, 'https://picsum.photos/seed/pc8/800/600', N'PC', 6, N'Hệ thống LED RGB ảo diệu nhất'),
(N'PC Gaming Pink Diamond', 28000000, 'https://picsum.photos/seed/pc9/800/600', N'PC', 3, N'Dành riêng cho các nữ game thủ cá tính'),
(N'PC Gaming Limited Edition', 150000000, 'https://picsum.photos/seed/pc10/800/600', N'PC', 1, N'Chỉ 10 bộ trên toàn thế giới'),
(N'PC Gaming 11', 13000000, 'https://picsum.photos/seed/pc11/400/300', N'PC', 10, N'Sản phẩm sắp về'),
(N'PC Gaming 12', 13500000, 'https://picsum.photos/seed/pc12/400/300', N'PC', 10, N'Sản phẩm sắp về'),
(N'PC Gaming 13', 14000000, 'https://picsum.photos/seed/pc13/400/300', N'PC', 10, N'Sản phẩm sắp về'),
(N'PC Gaming 14', 14500000, 'https://picsum.photos/seed/pc14/400/300', N'PC', 10, N'Sản phẩm sắp về'),
(N'PC Gaming 15', 15000000, 'https://picsum.photos/seed/pc15/400/300', N'PC', 10, N'Sản phẩm sắp về'),
(N'PC Gaming 16', 15500000, 'https://picsum.photos/seed/pc16/400/300', N'PC', 10, N'Sản phẩm sắp về'),
(N'PC Gaming 17', 16000000, 'https://picsum.photos/seed/pc17/400/300', N'PC', 10, N'Sản phẩm sắp về'),
(N'PC Gaming 18', 16500000, 'https://picsum.photos/seed/pc18/400/300', N'PC', 10, N'Sản phẩm sắp về'),
(N'PC Gaming 19', 17000000, 'https://picsum.photos/seed/pc19/400/300', N'PC', 10, N'Sản phẩm sắp về'),
(N'PC Gaming 20', 17500000, 'https://picsum.photos/seed/pc20/400/300', N'PC', 10, N'Sản phẩm sắp về'),

(N'Samsung Odyssey G9 OLED', 45000000, 'https://images.samsung.com/is/image/samsung/p6pim/vn/ls49cg954sexxv/gallery/vn-odyssey-oled-g9-g95sc-ls49cg954sexxv-536712345', N'Monitor', 5, N'Màn hình cong 49 inch siêu rộng'),
(N'LG UltraGear 27GR95QE-B', 22000000, 'https://www.lg.com/us/images/monitors/md08000000/gallery/desktop-01.jpg', N'Monitor', 10, N'Màn hình OLED 240Hz cực đỉnh'),
(N'ASUS ROG Swift PG32UCDM', 38000000, 'https://dlcdnwebimgs.asus.com/gain/4f3e8e3d8e3d8e3d8e3d8e3d8e3d8e3d', N'Monitor', 3, N'Màn hình 4K QD-OLED đầu tiên thế giới'),
(N'Dell Alienware AW3423DW', 32000000, 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/monitors/alienware-monitors/aw3423dw/media-gallery/monitor-alienware-aw3423dw-gallery-1.psd?fmt=pjpg&pscan=auto&scl=1&wid=4000&hei=4000&qlt=100,0&resMode=sharp2&size=4000,4000', N'Monitor', 4, N'Chuẩn mực màn hình gaming cong'),
(N'GIGABYTE M27Q', 8500000, 'https://www.gigabyte.com/Image/5d3e8e3d8e3d8e3d8e3d8e3d8e3d8e3d', N'Monitor', 20, N'Màn hình 2K quốc dân cho game thủ'),
(N'ViewSonic Elite XG270QG', 15000000, 'https://www.viewsonic.com/library/wp-content/uploads/2019/11/XG270QG_Front_Left_1.png', N'Monitor', 6, N'Màu sắc chuẩn đồ họa, tốc độ chuẩn gaming'),
(N'BenQ Zowie XL2546K', 13500000, 'https://zowie.benq.com/content/dam/gaming/common/product-images/monitor/xl2546k/gallery/xl2546k-01.png', N'Monitor', 15, N'Tiêu chuẩn thi đấu Esport chuyên nghiệp'),
(N'AOC 24G2', 4500000, 'https://m.media-amazon.com/images/I/81N1N1N1N1L._AC_SL1500_.jpg', N'Monitor', 30, N'Màn hình 144Hz giá rẻ tốt nhất'),
(N'MSI Optix MAG274QRF-QD', 11000000, 'https://storage-asset.msi.com/global/picture/image/feature/monitor/Optix-MAG274QRF-QD/mag274-1.png', N'Monitor', 12, N'Công nghệ Quantum Dot cho màu sắc rực rỡ'),
(N'Samsung Odyssey G5', 7500000, 'https://images.samsung.com/is/image/samsung/p6pim/vn/lc27g55tqbexxv/gallery/vn-odyssey-g5-g55t-lc27g55tqbexxv-534512345', N'Monitor', 25, N'Màn hình cong 2K giá cực hời'),
(N'Monitor Gaming 11', 5000000, 'https://picsum.photos/seed/mon11/400/300', N'Monitor', 10, N'Sản phẩm sắp về'),
(N'Monitor Gaming 12', 5200000, 'https://picsum.photos/seed/mon12/400/300', N'Monitor', 10, N'Sản phẩm sắp về'),
(N'Monitor Gaming 13', 5400000, 'https://picsum.photos/seed/mon13/400/300', N'Monitor', 10, N'Sản phẩm sắp về'),
(N'Monitor Gaming 14', 5600000, 'https://picsum.photos/seed/mon14/400/300', N'Monitor', 10, N'Sản phẩm sắp về'),
(N'Monitor Gaming 15', 5800000, 'https://picsum.photos/seed/mon15/400/300', N'Monitor', 10, N'Sản phẩm sắp về'),
(N'Monitor Gaming 16', 6000000, 'https://picsum.photos/seed/mon16/400/300', N'Monitor', 10, N'Sản phẩm sắp về'),
(N'Monitor Gaming 17', 6200000, 'https://picsum.photos/seed/mon17/400/300', N'Monitor', 10, N'Sản phẩm sắp về'),
(N'Monitor Gaming 18', 6400000, 'https://picsum.photos/seed/mon18/400/300', N'Monitor', 10, N'Sản phẩm sắp về'),
(N'Monitor Gaming 19', 6600000, 'https://picsum.photos/seed/mon19/400/300', N'Monitor', 10, N'Sản phẩm sắp về'),
(N'Monitor Gaming 20', 6800000, 'https://picsum.photos/seed/mon20/400/300', N'Monitor', 10, N'Sản phẩm sắp về'),

(N'Corsair K100 RGB', 5500000, 'https://www.corsair.com/corsairmedia/sys_master/productcontent/CH-912A01A-NA-K100_RGB_01.png', N'Keyboard', 10, N'Bàn phím cơ cao cấp nhất của Corsair'),
(N'Razer Huntsman V2 Analog', 6200000, 'https://assets2.razerzone.com/images/pnx.assets/6f3e8e3d8e3d8e3d8e3d8e3d8e3d8e3d/razer-huntsman-v2-analog-500x500.png', N'Keyboard', 15, N'Switch quang học tùy chỉnh điểm nhận lệnh'),
(N'SteelSeries Apex Pro', 4800000, 'https://media.steelseriescdn.com/thumbs/catalogue/products/01077-apex-pro/4f3e8e3d8e3d8e3d8e3d8e3d8e3d8e3d.png', N'Keyboard', 20, N'Bàn phím nhanh nhất thế giới'),
(N'Logitech G915 TKL', 4200000, 'https://resource.logitechg.com/w_692,c_lpad,ar_4:3,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/g915-tkl/g915-tkl-gallery-1.png?v=1', N'Keyboard', 25, N'Thiết kế Low-profile sang trọng'),
(N'Akko 3068B Multi-mode', 1650000, 'https://akkogear.com.vn/wp-content/uploads/2021/11/akko-3068b-blue-on-white-1.jpg', N'Keyboard', 40, N'Bàn phím cơ không dây quốc dân'),
(N'Keychron Q1 QMK', 3800000, 'https://www.keychron.com/cdn/shop/products/Keychron-Q1-QMK-Custom-Mechanical-Keyboard-Version-2-Carbon-Black-1_1024x1024.jpg', N'Keyboard', 12, N'Vỏ nhôm CNC cao cấp cho người sành chơi'),
(N'ASUS ROG Strix Flare II Animate', 5200000, 'https://dlcdnwebimgs.asus.com/gain/4f3e8e3d8e3d8e3d8e3d8e3d8e3d8e3d', N'Keyboard', 8, N'Màn hình LED AniMe Matrix độc đáo'),
(N'HyperX Alloy Origins', 2100000, 'https://row.hyperx.com/cdn/shop/products/hyperx_alloy_origins_1_main_900x.jpg', N'Keyboard', 30, N'Cảm giác gõ mượt mà, khung nhôm bền bỉ'),
(N'Ducky One 3 Daybreak', 2800000, 'https://www.duckychannel.com.tw/upload/2021_11_1920_29_35.png', N'Keyboard', 10, N'Chất lượng build huyền thoại từ Đài Loan'),
(N'Varmilo VA87M Summit', 3500000, 'https://en.varmilo.com/keyboard/upload/202005/1590740645645.png', N'Keyboard', 5, N'Tác phẩm nghệ thuật trên bàn làm việc'),
(N'Keyboard Gaming 11', 800000, 'https://picsum.photos/seed/kb11/400/300', N'Keyboard', 10, N'Sản phẩm sắp về'),
(N'Keyboard Gaming 12', 850000, 'https://picsum.photos/seed/kb12/400/300', N'Keyboard', 10, N'Sản phẩm sắp về'),
(N'Keyboard Gaming 13', 900000, 'https://picsum.photos/seed/kb13/400/300', N'Keyboard', 10, N'Sản phẩm sắp về'),
(N'Keyboard Gaming 14', 950000, 'https://picsum.photos/seed/kb14/400/300', N'Keyboard', 10, N'Sản phẩm sắp về'),
(N'Keyboard Gaming 15', 1000000, 'https://picsum.photos/seed/kb15/400/300', N'Keyboard', 10, N'Sản phẩm sắp về'),
(N'Keyboard Gaming 16', 1050000, 'https://picsum.photos/seed/kb16/400/300', N'Keyboard', 10, N'Sản phẩm sắp về'),
(N'Keyboard Gaming 17', 1100000, 'https://picsum.photos/seed/kb17/400/300', N'Keyboard', 10, N'Sản phẩm sắp về'),
(N'Keyboard Gaming 18', 1150000, 'https://picsum.photos/seed/kb18/400/300', N'Keyboard', 10, N'Sản phẩm sắp về'),
(N'Keyboard Gaming 19', 1200000, 'https://picsum.photos/seed/kb19/400/300', N'Keyboard', 10, N'Sản phẩm sắp về'),
(N'Keyboard Gaming 20', 1250000, 'https://picsum.photos/seed/kb20/400/300', N'Keyboard', 10, N'Sản phẩm sắp về'),

(N'Logitech G Pro X Superlight', 3500000, 'https://resource.logitechg.com/w_692,c_lpad,ar_4:3,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/g-pro-x-superlight/g-pro-x-superlight-black-gallery-1.png?v=1', N'Mouse', 50, N'Chuột gaming siêu nhẹ đỉnh nhất thế giới'),
(N'Razer DeathAdder V3 Pro', 3200000, 'https://assets2.razerzone.com/images/pnx.assets/f305f6e80b2a59a721798369680373e3/razer-deathadder-v3-pro-500x500.png', N'Mouse', 30, N'Thiết kế công thái học huyền thoại'),
(N'SteelSeries Rival 600', 1800000, 'https://media.steelseriescdn.com/thumbs/catalogue/products/00882-rival-600/e9a7e6b0b5d1446797a7e1f57e6a7e5c.png.500x400_q100_crop-fit_optimize.png', N'Mouse', 20, N'Hệ thống cảm biến kép chính xác'),
(N'Zowie EC2-C', 1650000, 'https://zowie.benq.com/content/dam/gaming/common/product-images/mouse/ec2-c/gallery/ec2-c-01.png', N'Mouse', 15, N'Sự lựa chọn số 1 của game thủ CS:GO'),
(N'Corsair Nightsword RGB', 2100000, 'https://www.corsair.com/corsairmedia/sys_master/productcontent/CH-9305011-NA-Nightsword_RGB_01.png', N'Mouse', 10, N'Tùy chỉnh trọng lượng linh hoạt'),
(N'Logitech G502 Lightspeed', 2800000, 'https://resource.logitechg.com/w_692,c_lpad,ar_4:3,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/g502-lightspeed/g502-lightspeed-gallery-1.png?v=1', N'Mouse', 40, N'Chuột gaming bán chạy nhất mọi thời đại'),
(N'Razer Basilisk V3', 1900000, 'https://assets2.razerzone.com/images/pnx.assets/5d3c8c7f3b8b1f8e8e3d8e8e3d8e8e3d/razer-basilisk-v3-500x500.png', N'Mouse', 25, N'Con lăn thông minh HyperScroll'),
(N'HyperX Pulsefire Haste', 1100000, 'https://row.hyperx.com/cdn/shop/products/hyperx_pulsefire_haste_black_1_main_900x.jpg', N'Mouse', 100, N'Chuột tổ ong siêu thoáng khí'),
(N'ASUS ROG Keris Wireless', 2300000, 'https://dlcdnwebimgs.asus.com/gain/49B0E5D1-C99D-4F43-8F0E-6F3F3E8E3D8E', N'Mouse', 12, N'Switch có thể thay thế dễ dàng'),
(N'Glorious Model O Wireless', 1950000, 'https://cdn.shopify.com/s/files/1/0549/2681/products/ModelOWireless-MatteBlack-Top_1024x1024.png', N'Mouse', 18, N'Chuột không dây nhẹ nhất tầm giá'),
(N'Logitech G304 Lightspeed', 850000, 'https://resource.logitechg.com/w_692,c_lpad,ar_4:3,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/g305/g305-gallery-1.png?v=1', N'Mouse', 60, N'Chuột không dây quốc dân'),
(N'Razer Viper V2 Pro', 3400000, 'https://assets2.razerzone.com/images/pnx.assets/6f8c7e8e3d8e3d8e3d8e3d8e3d8e3d8e/razer-viper-v2-pro-500x500.png', N'Mouse', 14, N'Tốc độ phản hồi cực nhanh'),
(N'SteelSeries Aerox 3 Wireless', 2450000, 'https://media.steelseriescdn.com/thumbs/catalogue/products/01221-aerox-3-wireless-2022-black/4f3e8e3d8e3d8e3d8e3d8e3d8e3d8e3d.png', N'Mouse', 10, N'Chống nước IP54 cho chuột tổ ong'),
(N'BenQ Zowie S2-C', 1700000, 'https://zowie.benq.com/content/dam/gaming/common/product-images/mouse/s2-c/gallery/s2-c-01.png', N'Mouse', 22, N'Thiết kế cho các kiểu cầm đối xứng'),
(N'Corsair Sabre RGB Pro', 1550000, 'https://www.corsair.com/corsairmedia/sys_master/productcontent/CH-9303111-NA-Sabre_RGB_Pro_01.png', N'Mouse', 8, N'Tần số quét 8000Hz siêu mượt'),
(N'Logitech G102 Gen2 Lightsync', 450000, 'https://resource.logitechg.com/w_692,c_lpad,ar_4:3,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/g102-lightsync/g102-lightsync-gallery-1.png?v=1', N'Mouse', 150, N'Chuột giá rẻ tốt nhất hiện nay'),
(N'Razer Orochi V2', 1750000, 'https://assets2.razerzone.com/images/pnx.assets/8f3e8e3d8e3d8e3d8e3d8e3d8e3d8e3d/razer-orochi-v2-500x500.png', N'Mouse', 35, N'Chuột gaming di động dùng pin'),
(N'Cooler Master MM711', 1200000, 'https://m.media-amazon.com/images/I/71N1N1N1N1L._AC_SL1500_.jpg', N'Mouse', 20, N'Siêu nhẹ với thiết kế đặc biệt'),
(N'Finalmouse Starlight-12', 5500000, 'https://m.media-amazon.com/images/I/61N1N1N1N1L._AC_SL1500_.jpg', N'Mouse', 3, N'Chuột hợp kim Magie siêu hiếm'),
(N'Pulsar X2 Wireless', 2200000, 'https://m.media-amazon.com/images/I/51N1N1N1N1L._AC_SL1500_.jpg', N'Mouse', 10, N'Hiệu năng đỉnh cao từ thương hiệu mới');