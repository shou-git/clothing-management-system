const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const cors = require('cors');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 8080;

// 中间件
app.use(cors());
// 注意：express.json() 和 express.urlencoded() 会读取请求体
// 对于文件上传接口，multer 会处理请求体，所以这些中间件不会影响文件上传
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// 确保必要的目录存在
const dirs = ['uploads', 'uploads/products', 'uploads/looks', 'templates'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// 数据库初始化
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
    } else {
        console.log('数据库连接成功');
        initDatabase();
    }
});

// 生成缩略图辅助函数
async function createThumbnail(filePath) {
    try {
        const ext = path.extname(filePath);
        const dir = path.dirname(filePath);
        const name = path.basename(filePath, ext);
        const thumbPath = path.join(dir, `${name}_thumb${ext}`);

        // 只有图片才生成缩略图
        if (!['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff'].includes(ext.toLowerCase())) {
            return false;
        }

        await sharp(filePath)
            .resize({ width: 512, withoutEnlargement: true })
            .toFile(thumbPath);

        console.log(`缩略图已生成: ${thumbPath}`);
        return true;
    } catch (error) {
        console.error('生成缩略图失败:', error);
        return false;
    }
}

// 初始化数据库表
function initDatabase() {
    db.serialize(() => {
        // 商品表 - 字段顺序：货号、条形码、设计师、颜色、尺寸、品名、备注、商品ID
        db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image TEXT,
        product_no TEXT,
        barcode TEXT,
        designer TEXT,
        color TEXT,
        size TEXT,
        product_name TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // 检查是否需要迁移旧数据（如果存在 category 或 location 字段）
        db.all("PRAGMA table_info(products)", [], (err, columns) => {
            if (err) {
                console.error('检查表结构失败:', err);
                return;
            }

            const hasOldFields = columns.some(col => col.name === 'category' || col.name === 'location');
            const hasNewFields = columns.some(col => col.name === 'designer' || col.name === 'product_name');

            if (hasOldFields && !hasNewFields) {
                console.log('检测到旧表结构，开始迁移数据...');
                // 创建新表
                db.run(`
                    CREATE TABLE IF NOT EXISTS products_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        image TEXT,
                        product_no TEXT,
                        barcode TEXT,
                        designer TEXT,
                        color TEXT,
                        size TEXT,
                        product_name TEXT,
                        notes TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err) => {
                    if (err) {
                        console.error('创建新表失败:', err);
                        return;
                    }

                    // 迁移数据
                    db.run(`
                        INSERT INTO products_new (id, image, product_no, barcode, designer, color, size, product_name, notes, created_at)
                        SELECT id, image, product_no, barcode, '', color, size, '', notes, created_at
                        FROM products
                    `, (err) => {
                        if (err) {
                            console.error('数据迁移失败:', err);
                            return;
                        }

                        // 删除旧表
                        db.run('DROP TABLE products', (err) => {
                            if (err) {
                                console.error('删除旧表失败:', err);
                                return;
                            }

                            // 重命名新表
                            db.run('ALTER TABLE products_new RENAME TO products', (err) => {
                                if (err) {
                                    console.error('重命名表失败:', err);
                                    return;
                                }
                                console.log('数据库表结构迁移完成');
                            });
                        });
                    });
                });
            } else if (!hasNewFields) {
                // 新数据库，添加新字段
                db.run('ALTER TABLE products ADD COLUMN designer TEXT', () => { });
                db.run('ALTER TABLE products ADD COLUMN product_name TEXT', () => { });
            }
        });

        // Look表
        db.run(`
      CREATE TABLE IF NOT EXISTS looks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image TEXT,
        name TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // 商品-Look多对多关系表
        db.run(`
      CREATE TABLE IF NOT EXISTS product_look (
        product_id INTEGER,
        look_id INTEGER,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (look_id) REFERENCES looks(id) ON DELETE CASCADE,
        PRIMARY KEY (product_id, look_id)
      )
    `);

        console.log('数据库表初始化完成');
    });
}

// 配置图片上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // 从query参数获取type，确保在文件保存时能正确获取
        const type = req.query.type || req.body.type || 'products';
        const uploadPath = path.join('uploads', type);
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('只支持图片文件！'));
        }
    }
});

// Excel 文件上传配置（单独配置，不限制文件类型）
const excelUpload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadPath = 'uploads/temp'; // 临时目录
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    }),
    limits: { fileSize: 500 * 1024 * 1024 }, // 限制为500MB（暂不限制大小）
    fileFilter: (req, file, cb) => {
        const allowedTypes = /xlsx|xls/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        } else {
            cb(new Error('只支持 Excel 文件（.xlsx 或 .xls）！'));
        }
    }
});

// ==================== API 路由 ====================

// 错误信息翻译函数：将英文错误信息转换为中文
function translateError(errorMessage) {
    if (!errorMessage) return '未知错误';

    const msg = String(errorMessage);

    // 请求体相关错误
    if (msg.includes('body is disturbed') || msg.includes('body is locked')) {
        return '请求体已被读取，请检查文件上传配置';
    }
    if (msg.includes('Unexpected field')) {
        return '文件字段名不匹配，请检查上传表单配置';
    }
    if (msg.includes('File too large')) {
        return '文件太大，请压缩后重试或分批导入';
    }
    if (msg.includes('MulterError')) {
        return '文件上传错误';
    }

    // 数据库相关错误
    if (msg.includes('UNIQUE constraint failed')) {
        return '数据重复（条形码或货号已存在）';
    }
    if (msg.includes('NOT NULL constraint failed')) {
        return '必填字段不能为空';
    }
    if (msg.includes('FOREIGN KEY constraint failed')) {
        return '关联数据不存在';
    }
    if (msg.includes('SQLITE_CONSTRAINT')) {
        return '数据约束错误';
    }

    // 文件系统相关错误
    if (msg.includes('ENOENT')) {
        return '文件或目录不存在';
    }
    if (msg.includes('EACCES')) {
        return '没有权限访问文件';
    }
    if (msg.includes('EMFILE')) {
        return '打开文件过多，请稍后重试';
    }
    if (msg.includes('ENOSPC')) {
        return '磁盘空间不足';
    }

    // 网络相关错误
    if (msg.includes('ECONNREFUSED')) {
        return '无法连接到服务器';
    }
    if (msg.includes('timeout')) {
        return '操作超时，请稍后重试';
    }

    // 文件格式相关错误
    if (msg.includes('Cannot read property')) {
        return '无法读取文件属性，文件可能已损坏';
    }
    if (msg.includes('Unexpected end of JSON')) {
        return '文件格式错误，无法解析';
    }
    if (msg.includes('Invalid file format')) {
        return '无效的文件格式';
    }
    if (msg.includes('Corrupted file')) {
        return '文件已损坏';
    }

    // 如果无法识别，返回原错误信息（可能是中文）
    return msg;
}

// 图片上传
app.post('/api/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '没有上传文件' });
    }
    // 从query或body获取type，与storage配置保持一致
    const type = req.query.type || req.body.type || 'products';
    console.log('上传文件:', req.file.filename, '类型:', type, '保存路径:', req.file.path);

    // 如果是商品图片，生成缩略图
    if (type === 'products') {
        await createThumbnail(req.file.path);
    }

    res.json({
        success: true,
        path: `/uploads/${type}/${req.file.filename}`
    });
});

// ==================== 商品相关API ====================

// 获取商品列表（支持搜索）
app.get('/api/products', (req, res) => {
    const search = req.query.search || '';

    let sql = `
    SELECT p.*, 
      (SELECT COUNT(*) FROM product_look pl WHERE pl.product_id = p.id) as look_count
    FROM products p
    WHERE 1=1
  `;
    const params = [];

    if (search) {
        sql += ` AND (
      p.barcode LIKE ? OR 
      p.product_no LIKE ? OR 
      p.designer LIKE ? OR
      p.color LIKE ? OR 
      p.size LIKE ? OR 
      p.product_name LIKE ? OR
      p.notes LIKE ?
    )`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    sql += ` ORDER BY p.id DESC`;

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: translateError(err.message) });
        }

        // 添加缩略图字段
        const results = rows.map(row => {
            if (row.image && row.image.startsWith('/uploads/products/')) {
                // 构造缩略图路径: /uploads/products/filename.ext -> /uploads/products/filename_thumb.ext
                const lastDotIndex = row.image.lastIndexOf('.');
                if (lastDotIndex !== -1) {
                    row.thumbnail = row.image.substring(0, lastDotIndex) + '_thumb' + row.image.substring(lastDotIndex);
                } else {
                    row.thumbnail = row.image;
                }
            } else {
                row.thumbnail = row.image;
            }
            return row;
        });

        res.json(results);
    });
});

// 获取商品详情
app.get('/api/products/:id', (req, res) => {
    const sql = `SELECT * FROM products WHERE id = ?`;

    db.get(sql, [req.params.id], (err, product) => {
        if (err) {
            return res.status(500).json({ error: translateError(err.message) });
        }
        if (!product) {
            return res.status(404).json({ error: '商品不存在' });
        }

        // 获取该商品所属的Look
        const lookSql = `
      SELECT l.* FROM looks l
      INNER JOIN product_look pl ON l.id = pl.look_id
      WHERE pl.product_id = ?
      ORDER BY l.id DESC
    `;

        db.all(lookSql, [req.params.id], (err, looks) => {
            if (err) {
                return res.status(500).json({ error: translateError(err.message) });
            }
            product.looks = looks;
            res.json(product);
        });
    });
});

// 新增商品
app.post('/api/products', (req, res) => {
    const { image, product_no, barcode, designer, color, size, product_name, notes } = req.body;

    const sql = `
    INSERT INTO products (image, product_no, barcode, designer, color, size, product_name, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

    db.run(sql, [image, product_no, barcode, designer, color, size, product_name, notes], function (err) {
        if (err) {
            return res.status(500).json({ error: translateError(err.message) });
        }
        res.json({ success: true, id: this.lastID });
    });
});

// 更新商品
app.put('/api/products/:id', (req, res) => {
    const { image, product_no, barcode, designer, color, size, product_name, notes } = req.body;

    const sql = `
    UPDATE products 
    SET image = ?, product_no = ?, barcode = ?, designer = ?, color = ?, size = ?, 
        product_name = ?, notes = ?
    WHERE id = ?
  `;

    db.run(sql, [image, product_no, barcode, designer, color, size, product_name, notes, req.params.id], function (err) {
        if (err) {
            return res.status(500).json({ error: translateError(err.message) });
        }
        res.json({ success: true, changes: this.changes });
    });
});

// 删除商品
app.delete('/api/products/:id', (req, res) => {
    db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
        if (err) {
            return res.status(500).json({ error: translateError(err.message) });
        }
        res.json({ success: true, changes: this.changes });
    });
});

// 批量删除商品
app.post('/api/products/batch-delete', (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: '请提供要删除的商品ID列表' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `DELETE FROM products WHERE id IN (${placeholders})`;

    db.run(sql, ids, function (err) {
        if (err) {
            return res.status(500).json({ error: translateError(err.message) });
        }
        res.json({ success: true, count: this.changes });
    });
});

// ==================== Look相关API ====================

// 获取Look列表（支持搜索）
app.get('/api/looks', (req, res) => {
    const search = req.query.search || '';

    let sql = `
    SELECT l.*,
      (SELECT COUNT(*) FROM product_look pl WHERE pl.look_id = l.id) as product_count
    FROM looks l
    WHERE 1=1
  `;
    const params = [];

    if (search) {
        sql += ` AND (
      l.name LIKE ? OR 
      l.notes LIKE ? OR
      EXISTS (
        SELECT 1 FROM product_look pl
        INNER JOIN products p ON pl.product_id = p.id
        WHERE pl.look_id = l.id AND (
          p.barcode LIKE ? OR
          p.product_no LIKE ?
        )
      )
    )`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    sql += ` ORDER BY l.id DESC`;

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: translateError(err.message) });
        }
        res.json(rows);
    });
});

// 获取Look详情
app.get('/api/looks/:id', (req, res) => {
    const sql = `SELECT * FROM looks WHERE id = ?`;

    db.get(sql, [req.params.id], (err, look) => {
        if (err) {
            return res.status(500).json({ error: translateError(err.message) });
        }
        if (!look) {
            return res.status(404).json({ error: 'Look不存在' });
        }

        // 获取该Look包含的商品
        const productSql = `
      SELECT p.* FROM products p
      INNER JOIN product_look pl ON p.id = pl.product_id
      WHERE pl.look_id = ?
      ORDER BY p.id DESC
    `;

        db.all(productSql, [req.params.id], (err, products) => {
            if (err) {
                return res.status(500).json({ error: translateError(err.message) });
            }
            look.products = products;
            res.json(look);
        });
    });
});

// 新增Look
app.post('/api/looks', (req, res) => {
    const { image, name, notes, product_ids } = req.body;

    const sql = `INSERT INTO looks (image, name, notes) VALUES (?, ?, ?)`;

    db.run(sql, [image, name, notes], function (err) {
        if (err) {
            return res.status(500).json({ error: translateError(err.message) });
        }

        const lookId = this.lastID;

        // 添加商品关联
        if (product_ids && product_ids.length > 0) {
            const insertRelations = db.prepare('INSERT INTO product_look (product_id, look_id) VALUES (?, ?)');
            product_ids.forEach(productId => {
                insertRelations.run(productId, lookId);
            });
            insertRelations.finalize();
        }

        res.json({ success: true, id: lookId });
    });
});

// 更新Look
app.put('/api/looks/:id', (req, res) => {
    const { image, name, notes, product_ids } = req.body;

    const sql = `UPDATE looks SET image = ?, name = ?, notes = ? WHERE id = ?`;

    db.run(sql, [image, name, notes, req.params.id], function (err) {
        if (err) {
            return res.status(500).json({ error: translateError(err.message) });
        }

        // 删除旧的商品关联
        db.run('DELETE FROM product_look WHERE look_id = ?', [req.params.id], (err) => {
            if (err) {
                return res.status(500).json({ error: translateError(err.message) });
            }

            // 添加新的商品关联
            if (product_ids && product_ids.length > 0) {
                const insertRelations = db.prepare('INSERT INTO product_look (product_id, look_id) VALUES (?, ?)');
                product_ids.forEach(productId => {
                    insertRelations.run(productId, req.params.id);
                });
                insertRelations.finalize();
            }

            res.json({ success: true, changes: this.changes });
        });
    });
});

// 删除Look
app.delete('/api/looks/:id', (req, res) => {
    db.run('DELETE FROM looks WHERE id = ?', [req.params.id], function (err) {
        if (err) {
            return res.status(500).json({ error: translateError(err.message) });
        }
        res.json({ success: true, changes: this.changes });
    });
});

// ==================== Excel导入导出 ====================

// 下载Excel模板
app.get('/api/products/template/download', async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('商品模板');

        // 设置列 - 新字段顺序：货号、条形码、设计师、颜色、尺寸、品名、备注、图片
        worksheet.columns = [
            { header: '货号', key: 'product_no', width: 20 },
            { header: '条形码', key: 'barcode', width: 20 },
            { header: '设计师', key: 'designer', width: 15 },
            { header: '颜色', key: 'color', width: 15 },
            { header: '尺寸', key: 'size', width: 15 },
            { header: '品名', key: 'product_name', width: 20 },
            { header: '备注', key: 'notes', width: 30 },
            { header: '图片（可选）', key: 'image', width: 20 }
        ];

        // 设置标题行样式
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // 添加说明行
        worksheet.getCell('H1').note = '提示：可以在H列插入图片，图片会自动导入。支持JPEG、JPG、PNG、GIF、BMP等常见图片格式。';

        // 添加示例行
        worksheet.addRow({
            product_no: 'CL2024001',
            barcode: '6901234567890',
            designer: '张三',
            color: '白色',
            size: 'M',
            product_name: '连衣裙',
            notes: '春季新款',
            image: '（可在此单元格插入图片）'
        });

        // 设置响应头
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=product_template.xlsx');

        // 输出到响应
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ error: translateError(error.message) });
    }
});

// Excel导入商品
// 使用 excelUpload 中间件，专门用于 Excel 文件上传
app.post('/api/products/import', excelUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: '没有上传文件，请选择Excel文件后重试' });
        }

        // 检查文件类型
        const fileExt = path.extname(req.file.originalname).toLowerCase();
        if (fileExt !== '.xlsx' && fileExt !== '.xls') {
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ success: false, error: `不支持的文件格式：${fileExt}，请上传 .xlsx 或 .xls 格式的Excel文件` });
        }

        // 获取文件大小信息（用于日志）
        const fileStats = fs.statSync(req.file.path);
        const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);

        let workbook;
        let worksheet;
        try {
            workbook = new ExcelJS.Workbook();
            
            console.log(`开始读取Excel文件，大小: ${fileSizeMB}MB`);
            
            // 使用 Promise.race 设置超时（30秒）
            const readPromise = workbook.xlsx.readFile(req.file.path);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('文件读取超时（30秒）。文件可能太大或包含过多图片，请压缩后重试')), 30000);
            });
            
            await Promise.race([readPromise, timeoutPromise]);
            
            worksheet = workbook.getWorksheet(1);

            if (!worksheet) {
                throw new Error('Excel文件中没有找到工作表');
            }
            
            console.log(`Excel文件读取成功，工作表名称: ${worksheet.name}`);
        } catch (excelError) {
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            // 将英文错误信息转换为中文
            let errorMsg = translateError(excelError.message || String(excelError));

            return res.status(400).json({
                success: false,
                error: `Excel文件读取失败：${errorMsg}。\n\n如果文件包含很多高清图片或数据较多，建议：\n1. 压缩Excel中的图片后重试\n2. 分批导入数据`
            });
        }

        const products = [];
        const errors = [];

        // 读取所有图片，建立行号到图片的映射
        const imageMap = new Map(); // 行号 -> 图片数据

        try {
            // 获取工作表中的所有图片
            const images = worksheet.getImages();
            console.log(`Excel中找到 ${images.length} 张图片`);

            images.forEach((image, index) => {
                try {
                    // 获取图片的位置信息
                    let rowNumber = -1;

                    if (image.range && image.range.tl) {
                        // 浮动图片，通过左上角位置确定行号
                        // 使用 Math.round 处理小数行号，因为 ExcelJS 可能返回小数
                        rowNumber = Math.round(image.range.tl.row + 1);
                    } else if (image.type === 'image' && image.range) {
                        // 单元格背景图或其他类型
                        // 尝试从 range 字符串解析，例如 "H2:H2"
                        if (typeof image.range === 'string') {
                            const match = image.range.match(/[A-Z]+(\d+)/);
                            if (match) {
                                rowNumber = parseInt(match[1]);
                            }
                        }
                    }

                    if (rowNumber > 1) { // 跳过标题行和无效行
                        // 如果该行已经有图片，跳过（只取第一张图片）
                        if (imageMap.has(rowNumber)) {
                            return;
                        }

                        // 获取图片数据 - ExcelJS 中图片数据存储在 workbook.model.media 中
                        if (workbook.model && workbook.model.media && workbook.model.media[image.imageId]) {
                            const mediaItem = workbook.model.media[image.imageId];

                            if (mediaItem && mediaItem.buffer) {
                                // 根据图片类型确定扩展名 - 支持更多常见图片格式
                                let extension = 'png';
                                const imageType = (mediaItem.type || '').toLowerCase();
                                const imageExt = (mediaItem.extension || '').toLowerCase();

                                if (imageType.includes('jpeg') || imageType.includes('jpg') || imageExt === 'jpeg' || imageExt === 'jpg') {
                                    extension = 'jpg';
                                } else if (imageType.includes('png') || imageExt === 'png') {
                                    extension = 'png';
                                } else if (imageType.includes('gif') || imageExt === 'gif') {
                                    extension = 'gif';
                                } else if (imageType.includes('webp') || imageExt === 'webp') {
                                    extension = 'webp';
                                } else if (imageType.includes('bmp') || imageExt === 'bmp') {
                                    extension = 'bmp';
                                } else if (imageType.includes('tiff') || imageExt === 'tiff' || imageExt === 'tif') {
                                    extension = 'tiff';
                                }

                                // 确保 buffer 是 Buffer 类型
                                const imageBuffer = Buffer.isBuffer(mediaItem.buffer)
                                    ? mediaItem.buffer
                                    : Buffer.from(mediaItem.buffer);

                                imageMap.set(rowNumber, {
                                    buffer: imageBuffer,
                                    extension: extension
                                });

                                console.log(`找到第${rowNumber}行的图片 (ID: ${image.imageId}), 类型: ${extension}, 大小: ${imageBuffer.length} bytes`);
                            } else {
                                console.log(`图片 ID ${image.imageId} 没有数据 buffer`);
                            }
                        } else {
                            console.log(`找不到图片 ID ${image.imageId} 的媒体数据`);
                        }
                    } else {
                        console.log(`图片 ${index} 无法确定行号或在标题行:`, image.range);
                    }
                } catch (imgError) {
                    console.error('处理图片时出错:', imgError);
                }
            });
        } catch (imagesError) {
            console.error('读取图片列表时出错:', imagesError);
        }

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // 跳过标题行

            // 新字段顺序：货号、条形码、设计师、颜色、尺寸、品名、备注
            const product_no = row.getCell(1).value;
            const barcode = row.getCell(2).value;
            const designer = row.getCell(3).value;
            const color = row.getCell(4).value;
            const size = row.getCell(5).value;
            const product_name = row.getCell(6).value;
            const notes = row.getCell(7).value;

            // 验证逻辑修改：货号必填，条形码选填
            if (!product_no) {
                errors.push(`第${rowNumber}行：货号不能为空`);
                return;
            }

            products.push({
                rowNumber: rowNumber,
                product_no: product_no ? String(product_no) : '',
                barcode: barcode ? String(barcode) : '',
                designer: designer ? String(designer) : '',
                color: color ? String(color) : '',
                size: size ? String(size) : '',
                product_name: product_name ? String(product_name) : '',
                notes: notes ? String(notes) : '',
                imageData: imageMap.get(rowNumber) || null
            });
        });

        if (errors.length > 0) {
            // 删除临时文件
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                error: `数据验证失败：${errors.join('; ')}`
            });
        }

        if (products.length === 0) {
            // 删除临时文件
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                error: 'Excel文件中没有找到有效的数据行，请确保至少有一行数据（除标题行外）'
            });
        }

        // 保存图片并插入商品
        const stmt = db.prepare(`
      INSERT INTO products (image, product_no, barcode, designer, color, size, product_name, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

        let successCount = 0;
        let processedCount = 0;
        const totalProducts = products.length;

        // 处理每个商品（包括保存图片）
        for (const product of products) {
            try {
                let imagePath = '';

                // 如果有图片，保存图片
                if (product.imageData) {
                    try {
                        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                        const extension = product.imageData.extension || 'png';
                        const filename = `${uniqueSuffix}.${extension}`;
                        const uploadPath = path.join('uploads', 'products', filename);

                        // 确保目录存在
                        const uploadDir = path.join('uploads', 'products');
                        if (!fs.existsSync(uploadDir)) {
                            fs.mkdirSync(uploadDir, { recursive: true });
                        }

                        // 保存图片文件
                        fs.writeFileSync(uploadPath, product.imageData.buffer);
                        imagePath = `/uploads/products/${filename}`;

                        // 生成缩略图
                        await createThumbnail(uploadPath);
                    } catch (imageError) {
                        console.error(`第${product.rowNumber}行图片保存失败:`, imageError);
                        // 图片保存失败不影响商品导入，继续处理
                    }
                }

                // 插入商品数据
                stmt.run(
                    imagePath,
                    product.product_no,
                    product.barcode,
                    product.designer,
                    product.color,
                    product.size,
                    product.product_name,
                    product.notes,
                    (err) => {
                        processedCount++;
                        if (!err) {
                            successCount++;
                        } else {
                            // 将英文错误信息转换为中文
                            let errorMsg = translateError(err.message || String(err));
                            const finalErrorMsg = `第${product.rowNumber}行插入失败: ${errorMsg}`;
                            console.error(finalErrorMsg);
                            errors.push(finalErrorMsg);
                        }

                        // 所有商品处理完成后返回结果
                        if (processedCount === totalProducts) {
                            stmt.finalize(() => {
                                // 删除临时文件
                                if (req.file && fs.existsSync(req.file.path)) {
                                    fs.unlinkSync(req.file.path);
                                }

                                // 如果有部分失败，返回警告信息
                                if (successCount < totalProducts) {
                                    const failedCount = totalProducts - successCount;
                                    res.json({
                                        success: true,
                                        count: successCount,
                                        total: totalProducts,
                                        imagesImported: Array.from(imageMap.keys()).length,
                                        warning: `成功导入 ${successCount} 条，失败 ${failedCount} 条`,
                                        errors: errors.length > 0 ? errors.slice(0, 5) : [] // 只返回前5个错误
                                    });
                                } else {
                                    res.json({
                                        success: true,
                                        count: successCount,
                                        total: totalProducts,
                                        imagesImported: Array.from(imageMap.keys()).length
                                    });
                                }
                            });
                        }
                    }
                );
            } catch (error) {
                processedCount++;
                // 将英文错误信息转换为中文
                let errorMsg = translateError(error.message || String(error));
                const finalErrorMsg = `处理第${product.rowNumber}行时出错: ${errorMsg}`;
                console.error(finalErrorMsg);
                errors.push(finalErrorMsg);

                if (processedCount === totalProducts) {
                    stmt.finalize(() => {
                        if (req.file && fs.existsSync(req.file.path)) {
                            fs.unlinkSync(req.file.path);
                        }

                        if (successCount < totalProducts) {
                            const failedCount = totalProducts - successCount;
                            res.json({
                                success: true,
                                count: successCount,
                                total: totalProducts,
                                imagesImported: Array.from(imageMap.keys()).length,
                                warning: `成功导入 ${successCount} 条，失败 ${failedCount} 条`,
                                errors: errors.length > 0 ? errors.slice(0, 5) : []
                            });
                        } else {
                            res.json({
                                success: true,
                                count: successCount,
                                total: totalProducts,
                                imagesImported: Array.from(imageMap.keys()).length
                            });
                        }
                    });
                }
            }
        }

    } catch (error) {
        // 确保删除临时文件
        if (req.file && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('删除临时文件失败:', unlinkError);
            }
        }
        console.error('导入过程发生错误:', error);

        // 将英文错误信息转换为中文
        let errorMessage = translateError(error.message || String(error) || '未知错误');

        res.status(500).json({
            success: false,
            error: `导入失败：${errorMessage}。请检查文件格式是否正确，或联系管理员`
        });
    }
});

// Excel导出商品（全部或选中）
app.post('/api/products/export', async (req, res) => {
    try {
        const { ids } = req.body;
        let sql = 'SELECT * FROM products';
        let params = [];

        // 如果提供了 ids，只导出选中的商品
        if (ids && Array.isArray(ids) && ids.length > 0) {
            const placeholders = ids.map(() => '?').join(',');
            sql += ` WHERE id IN (${placeholders})`;
            params = ids;
        }

        sql += ' ORDER BY id DESC';

        db.all(sql, params, async (err, products) => {
            if (err) {
                return res.status(500).json({ error: translateError(err.message) });
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('商品列表');

            // 设置列 - 字段顺序：货号、条形码、设计师、颜色、尺寸、品名、备注、图片
            worksheet.columns = [
                { header: '货号', key: 'product_no', width: 20 },
                { header: '条形码', key: 'barcode', width: 20 },
                { header: '设计师', key: 'designer', width: 15 },
                { header: '颜色', key: 'color', width: 15 },
                { header: '尺寸', key: 'size', width: 15 },
                { header: '品名', key: 'product_name', width: 20 },
                { header: '备注', key: 'notes', width: 30 },
                { header: '图片', key: 'image', width: 20 }
            ];

            // 设置标题行样式和行高
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(1).height = 20;

            // 添加数据和图片
            for (let i = 0; i < products.length; i++) {
                const product = products[i];
                const rowNumber = i + 2; // Excel行号从1开始，第1行是标题

                // 添加文本数据
                worksheet.addRow({
                    product_no: product.product_no,
                    barcode: product.barcode,
                    designer: product.designer,
                    color: product.color,
                    size: product.size,
                    product_name: product.product_name,
                    notes: product.notes,
                    image: '' // 图片列留空，图片会通过 addImage 插入
                });

                // 设置数据行高度
                worksheet.getRow(rowNumber).height = 80;

                // 如果有图片，添加图片到Excel
                if (product.image) {
                    try {
                        // 转换图片路径为文件系统路径
                        let imagePath = product.image;
                        if (imagePath.startsWith('/uploads/')) {
                            imagePath = imagePath.substring(1); // 移除开头的 /
                        }

                        const fullImagePath = path.join(__dirname, imagePath);

                        // 检查图片文件是否存在
                        if (fs.existsSync(fullImagePath)) {
                            // 读取图片文件
                            const imageBuffer = fs.readFileSync(fullImagePath);

                            // 获取图片扩展名
                            const ext = path.extname(fullImagePath).toLowerCase();
                            let imageExtension = 'png';
                            if (ext === '.jpg' || ext === '.jpeg') {
                                imageExtension = 'jpeg';
                            } else if (ext === '.png') {
                                imageExtension = 'png';
                            } else if (ext === '.gif') {
                                imageExtension = 'gif';
                            }

                            // 添加图片到工作簿
                            const imageId = workbook.addImage({
                                buffer: imageBuffer,
                                extension: imageExtension,
                            });

                            // 将图片插入到单元格（第8列是图片列，即H列）
                            worksheet.addImage(imageId, {
                                tl: { col: 7, row: rowNumber - 1 }, // 左上角位置 (0-based)
                                ext: { width: 100, height: 75 } // 图片尺寸
                            });
                        }
                    } catch (imageError) {
                        console.error(`添加图片失败 (${product.product_no}):`, imageError.message);
                        // 图片添加失败不影响导出，继续处理
                    }
                }
            }

            // 设置响应头
            const filename = ids && ids.length > 0
                ? `products_selected_${Date.now()}.xlsx`
                : `products_all_${Date.now()}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

            // 输出到响应
            await workbook.xlsx.write(res);
            res.end();
        });
    } catch (error) {
        res.status(500).json({ error: translateError(error.message) });
    }
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
    console.log(`可以通过服务器IP访问`);
});

// 优雅关闭
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('数据库连接已关闭');
        process.exit(0);
    });
});

