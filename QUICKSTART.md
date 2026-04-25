# Quick Start / 快速开始

中文 | [English](#english)

## 1. 安装依赖

```bash
npm install
```

## 2. 启动服务

```bash
npm start
```

默认访问：

```text
http://localhost:8080
```

## 3. 第一次使用

1. 打开首页。
2. 进入“商品管理”，新增商品或下载模板后批量导入 Excel。
3. 进入“Look 管理”，创建 Look 并关联商品。
4. 点击右下角 `English / 中文` 按钮切换界面语言。

## 常用命令

```bash
# 开发模式
npm run dev

# 自定义端口
PORT=3000 npm start
```

## 注意

- `database.db` 会在首次启动时自动创建。
- `uploads/` 会保存上传图片，请定期备份。
- 默认没有登录认证，公开部署前建议自行增加访问控制。

---

## English

[中文](#quick-start--快速开始) | English

## 1. Install Dependencies

```bash
npm install
```

## 2. Start the Server

```bash
npm start
```

Default URL:

```text
http://localhost:8080
```

## 3. First Use

1. Open the home page.
2. Go to Products, create products manually or download the Excel template for bulk import.
3. Go to Looks, create a Look and associate products.
4. Use the `English / 中文` button in the bottom-right corner to switch UI language.

## Useful Commands

```bash
# Development mode
npm run dev

# Custom port
PORT=3000 npm start
```

## Notes

- `database.db` is created automatically on first run.
- `uploads/` stores uploaded images and should be backed up regularly.
- Authentication is not enabled by default; add access control before public deployment.
