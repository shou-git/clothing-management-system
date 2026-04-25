(function () {
    const STORAGE_KEY = 'clothing-management-lang';
    const LANGS = { zh: '中文', en: 'English' };

    const dictionary = {
        en: {
            '服装管理后台': 'Clothing Admin',
            '服装管理后台系统': 'Clothing Management System',
            '商品管理': 'Products',
            'Look 管理': 'Looks',
            'Look管理': 'Looks',
            '商品详情': 'Product Details',
            'Look 详情': 'Look Details',
            '新增商品': 'New Product',
            '编辑商品': 'Edit Product',
            '新增 Look': 'New Look',
            '编辑 Look': 'Edit Look',
            '返回首页': 'Home',
            '返回列表': 'Back to List',
            '导出全部': 'Export All',
            '导入Excel': 'Import Excel',
            '下载模板': 'Template',
            '确认导入': 'Import',
            '取消': 'Cancel',
            '编辑': 'Edit',
            '删除': 'Delete',
            '保存': 'Save',
            '更新': 'Update',
            '全选': 'Select All',
            '取消全选': 'Deselect All',
            '清空选择': 'Clear Selection',
            '暂无图片': 'No image',
            '暂无商品，点击上方"新增商品"开始添加': 'No products yet. Use "New Product" to add one.',
            '未找到匹配的商品': 'No matching products found',
            '暂无Look，点击上方"新增 Look"开始添加': 'No Looks yet. Use "New Look" to add one.',
            '未找到匹配的Look': 'No matching Looks found',
            '加载中...': 'Loading...',
            '正在上传...': 'Uploading...',
            '请勿关闭页面，正在处理文件...': 'Keep this page open while the file is processed.',
            '选择Excel文件': 'Choose Excel File',
            '导入商品': 'Import Products',
            '上传中...': 'Uploading...',
            '提示：': 'Tips:',
            'Look 名称:': 'Look name:',
            '备注:': 'Notes:',
            '包含商品数:': 'Products:',
            '包含的商品': 'Included Products',
            '该 Look 还未添加任何商品': 'This Look does not include any products yet.',
            'Look 不存在': 'Look not found',
            '商品不存在': 'Product not found',
            '货号': 'Product No.',
            '条码': 'Barcode',
            '条形码': 'Barcode',
            '设计师': 'Designer',
            '颜色': 'Color',
            '尺寸': 'Size',
            '品名': 'Product Name',
            '备注': 'Notes',
            '图片': 'Image',
            '商品ID': 'Product ID',
            '无货号': 'No product no.',
            '导出成功': 'Exported',
            '导出失败': 'Export failed',
            '加载商品失败': 'Failed to load products',
            '下载模板失败': 'Failed to download template',
            '删除成功': 'Deleted',
            '删除失败': 'Delete failed',
            '保存成功': 'Saved',
            '保存失败': 'Save failed',
            '上传失败': 'Upload failed',
            '请选择要导出的商品': 'Select products to export first',
            '搜索商品（货号/条码/设计师/颜色/尺寸/品名）': 'Search products (product no. / barcode / designer / color / size / name)',
            '搜索 Look（名称/备注/商品条码/货号）': 'Search Looks (name / notes / product barcode / product no.)',
            '选择要包含的商品': 'Select Products',
            '搜索商品': 'Search Products'
        }
    };

    const prefixRules = [
        ['条码:', 'Barcode:'],
        ['条形码:', 'Barcode:'],
        ['设计师:', 'Designer:'],
        ['颜色:', 'Color:'],
        ['尺寸:', 'Size:'],
        ['品名:', 'Product Name:'],
        ['备注:', 'Notes:'],
        ['类别:', 'Category:'],
        ['货号:', 'Product No.:'],
        ['已选择 ', 'Selected '],
        [' 件商品', ' products'],
        [' 个Look', ' Looks'],
        [' 个 Look', ' Looks'],
        ['包含的商品(', 'Included Products (']
    ];

    function getLang() {
        return localStorage.getItem(STORAGE_KEY) || 'zh';
    }

    function setLang(lang) {
        localStorage.setItem(STORAGE_KEY, lang);
        document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
        translatePage(lang);
        updateToggle(lang);
    }

    function translateText(value, lang) {
        if (lang === 'zh' || !value) return value;
        const trimmed = value.trim();
        const table = dictionary[lang] || {};

        if (table[trimmed]) {
            return value.replace(trimmed, table[trimmed]);
        }

        let translated = value;
        prefixRules.forEach(([zh, en]) => {
            translated = translated.replaceAll(zh, en);
        });
        return translated;
    }

    function translateNode(node, lang) {
        if (node.nodeType === Node.TEXT_NODE) {
            if (!node.nodeValue.trim()) return;
            if (!node.__i18nSource) node.__i18nSource = node.nodeValue;
            node.nodeValue = translateText(node.__i18nSource, lang);
            return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (node.closest && node.closest('[data-no-i18n]')) return;

        ['placeholder', 'title', 'aria-label'].forEach((attr) => {
            if (!node.hasAttribute || !node.hasAttribute(attr)) return;
            const sourceAttr = `data-i18n-source-${attr}`;
            if (!node.hasAttribute(sourceAttr)) {
                node.setAttribute(sourceAttr, node.getAttribute(attr));
            }
            node.setAttribute(attr, translateText(node.getAttribute(sourceAttr), lang));
        });

        Array.from(node.childNodes).forEach((child) => translateNode(child, lang));
    }

    function translatePage(lang) {
        if (!document.body) return;
        if (!document.documentElement.dataset.i18nSourceTitle) {
            document.documentElement.dataset.i18nSourceTitle = document.title;
        }
        document.title = translateText(document.documentElement.dataset.i18nSourceTitle, lang);
        translateNode(document.body, lang);
    }

    function updateToggle(lang) {
        const button = document.querySelector('[data-i18n-toggle]');
        if (!button) return;
        button.textContent = lang === 'en' ? '中文' : 'English';
        button.setAttribute('aria-label', lang === 'en' ? 'Switch to Chinese' : '切换到英文');
    }

    function mountToggle() {
        if (document.querySelector('[data-i18n-toggle]')) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'language-toggle';
        button.setAttribute('data-i18n-toggle', 'true');
        button.setAttribute('data-no-i18n', 'true');
        button.addEventListener('click', () => {
            setLang(getLang() === 'en' ? 'zh' : 'en');
        });
        document.body.appendChild(button);
        updateToggle(getLang());
    }

    document.addEventListener('DOMContentLoaded', () => {
        mountToggle();
        setLang(getLang());

        const observer = new MutationObserver(() => {
            window.clearTimeout(observer.__timer);
            observer.__timer = window.setTimeout(() => translatePage(getLang()), 50);
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });

    window.appI18n = { setLang, getLang, languages: LANGS };
})();
