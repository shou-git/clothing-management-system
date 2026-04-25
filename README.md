# Clothing Management System / 服装管理后台系统

中文 | [English](#english)

一个面向服装拍摄现场、样衣间和小型门店的轻量级 Web 后台。它支持商品资料管理、Look（造型/套装）管理、图片上传与缩略图、Excel 导入导出、扫码搜索和中英文界面切换。

## 功能特性

- 商品管理：新增、编辑、删除、详情查看、批量删除
- Look 管理：创建造型并关联多个商品
- 图片上传：本地存储，商品图片自动生成缩略图
- Excel 工作流：模板下载、批量导入、导出全部或选中商品
- 搜索：商品与 Look 模糊搜索，适合扫码枪快速录入和查找
- 中英文切换：前端右下角语言按钮，语言偏好保存在浏览器本地
- 零构建前端：Vue 3 CDN + 原生 CSS，部署简单
- SQLite 数据库：首次启动自动初始化表结构

## 技术栈

- 后端：Node.js, Express, SQLite
- 前端：Vue 3 CDN, HTML, CSS
- 文件上传：Multer
- 图片处理：Sharp
- Excel：ExcelJS

## 快速开始

```bash
npm install
npm start
```

默认访问地址：

```text
http://localhost:8080
```

开发模式：

```bash
npm run dev
```

## 环境要求

- Node.js 14 或更高版本，推荐使用当前 LTS
- npm
- 可写入的项目目录，用于自动创建 `database.db` 和 `uploads/`

## 数据与文件

运行时会自动生成：

- `database.db`：SQLite 数据库
- `uploads/`：上传图片目录
- `templates/`：Excel 模板相关目录

这些运行时文件不建议提交到 GitHub，已经在 `.gitignore` 中忽略。

## 数据库结构

### `products`

| 字段 | 说明 |
| --- | --- |
| `id` | 主键 |
| `image` | 商品图片路径 |
| `product_no` | 货号 |
| `barcode` | 条形码 |
| `designer` | 设计师 |
| `color` | 颜色 |
| `size` | 尺寸 |
| `product_name` | 品名 |
| `notes` | 备注 |
| `created_at` | 创建时间 |

### `looks`

| 字段 | 说明 |
| --- | --- |
| `id` | 主键 |
| `image` | Look 图片路径 |
| `name` | Look 名称 |
| `notes` | 备注 |
| `created_at` | 创建时间 |

### `product_look`

商品与 Look 的多对多关系表。

## API 概览

### 商品

- `GET /api/products`：商品列表，支持 `?search=`
- `GET /api/products/:id`：商品详情
- `POST /api/products`：新增商品
- `PUT /api/products/:id`：更新商品
- `DELETE /api/products/:id`：删除商品
- `POST /api/products/batch-delete`：批量删除商品
- `GET /api/products/template/download`：下载 Excel 模板
- `POST /api/products/import`：导入 Excel
- `POST /api/products/export`：导出 Excel

### Look

- `GET /api/looks`：Look 列表，支持 `?search=`
- `GET /api/looks/:id`：Look 详情
- `POST /api/looks`：新增 Look
- `PUT /api/looks/:id`：更新 Look
- `DELETE /api/looks/:id`：删除 Look

### 上传

- `POST /api/upload?type=products`：上传商品图片
- `POST /api/upload?type=looks`：上传 Look 图片

## 项目结构

```text
.
├── server.js
├── package.json
├── public/
│   ├── index.html
│   ├── products.html
│   ├── product-detail.html
│   ├── product-form.html
│   ├── looks.html
│   ├── look-detail.html
│   ├── look-form.html
│   ├── css/style.css
│   └── js/i18n.js
├── DEPLOY.md
├── QUICKSTART.md
├── USAGE.md
└── README.md
```

## 生产部署

推荐使用 PM2：

```bash
npm install --production
pm2 start server.js --name clothing-management
pm2 save
```

如果需要修改端口：

```bash
PORT=8080 npm start
```

## 安全提示

本项目默认没有登录认证，更适合内网、单机或可信网络使用。公开部署时建议增加认证、HTTPS、访问控制和定期备份。

## 许可证

ISC

---

## English

[中文](#clothing-management-system--服装管理后台系统) | English

A lightweight web admin for clothing shoots, sample rooms, and small retail workflows. It supports product records, Look/outfit management, image uploads with thumbnails, Excel import/export, barcode-friendly search, and a Chinese/English UI switcher.

## Features

- Product management: create, edit, delete, detail view, batch delete
- Look management: create outfits and associate multiple products
- Image uploads: local storage and automatic product thumbnails
- Excel workflow: template download, bulk import, export all or selected products
- Search: fuzzy search for products and Looks, useful with barcode scanners
- Bilingual UI: language toggle in the bottom-right corner, persisted in local storage
- No frontend build step: Vue 3 via CDN + plain CSS
- SQLite database: tables are initialized automatically on first run

## Stack

- Backend: Node.js, Express, SQLite
- Frontend: Vue 3 CDN, HTML, CSS
- Uploads: Multer
- Image processing: Sharp
- Excel: ExcelJS

## Quick Start

```bash
npm install
npm start
```

Default URL:

```text
http://localhost:8080
```

Development mode:

```bash
npm run dev
```

## Requirements

- Node.js 14 or newer, current LTS recommended
- npm
- A writable project directory so the app can create `database.db` and `uploads/`

## Runtime Data

Generated at runtime:

- `database.db`: SQLite database
- `uploads/`: uploaded images
- `templates/`: Excel template-related files

These runtime files should not be committed and are ignored in `.gitignore`.

## Database Schema

### `products`

| Field | Description |
| --- | --- |
| `id` | Primary key |
| `image` | Product image path |
| `product_no` | Product number |
| `barcode` | Barcode |
| `designer` | Designer |
| `color` | Color |
| `size` | Size |
| `product_name` | Product name |
| `notes` | Notes |
| `created_at` | Created time |

### `looks`

| Field | Description |
| --- | --- |
| `id` | Primary key |
| `image` | Look image path |
| `name` | Look name |
| `notes` | Notes |
| `created_at` | Created time |

### `product_look`

Many-to-many relation table between products and Looks.

## API Overview

### Products

- `GET /api/products`: list products, supports `?search=`
- `GET /api/products/:id`: product detail
- `POST /api/products`: create product
- `PUT /api/products/:id`: update product
- `DELETE /api/products/:id`: delete product
- `POST /api/products/batch-delete`: batch delete products
- `GET /api/products/template/download`: download Excel template
- `POST /api/products/import`: import Excel
- `POST /api/products/export`: export Excel

### Looks

- `GET /api/looks`: list Looks, supports `?search=`
- `GET /api/looks/:id`: Look detail
- `POST /api/looks`: create Look
- `PUT /api/looks/:id`: update Look
- `DELETE /api/looks/:id`: delete Look

### Uploads

- `POST /api/upload?type=products`: upload product image
- `POST /api/upload?type=looks`: upload Look image

## Project Structure

```text
.
├── server.js
├── package.json
├── public/
│   ├── index.html
│   ├── products.html
│   ├── product-detail.html
│   ├── product-form.html
│   ├── looks.html
│   ├── look-detail.html
│   ├── look-form.html
│   ├── css/style.css
│   └── js/i18n.js
├── DEPLOY.md
├── QUICKSTART.md
├── USAGE.md
└── README.md
```

## Production Deployment

PM2 is recommended:

```bash
npm install --production
pm2 start server.js --name clothing-management
pm2 save
```

To change the port:

```bash
PORT=8080 npm start
```

## Security Notes

Authentication is not enabled by default. The app is best suited for intranet, local, or trusted-network use. For public deployment, add authentication, HTTPS, access controls, and regular backups.

## License

ISC
