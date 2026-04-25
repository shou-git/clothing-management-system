# Project Summary / 项目总结

中文 | [English](#english)

## 中文

这是一个轻量级服装管理后台，适合服装拍摄、样衣间、门店或小团队内部使用。项目使用 Node.js + Express 提供 API，SQLite 作为本地数据库，前端使用 Vue 3 CDN 和原生 CSS，不需要前端构建步骤。

核心能力：

- 商品资料管理
- Look / 造型管理
- 商品与 Look 多对多关联
- 图片上传与商品缩略图生成
- Excel 模板、导入和导出
- 搜索与扫码枪友好的输入体验
- 中英文界面切换

默认运行地址为 `http://localhost:8080`。运行时数据包括 `database.db` 和 `uploads/`，这些文件应作为业务数据备份，不应提交到源码仓库。

## English

[中文](#project-summary--项目总结) | English

This is a lightweight clothing management admin app for photo shoots, sample rooms, stores, or small internal teams. The backend is built with Node.js and Express, data is stored in SQLite, and the frontend uses Vue 3 via CDN with plain CSS, so no frontend build step is required.

Core capabilities:

- Product record management
- Look / outfit management
- Many-to-many product and Look associations
- Image uploads and product thumbnail generation
- Excel templates, import, and export
- Search and barcode-scanner-friendly input
- Chinese/English UI switcher

The default local URL is `http://localhost:8080`. Runtime data includes `database.db` and `uploads/`; these should be backed up as business data and should not be committed to the source repository.
