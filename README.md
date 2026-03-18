# FronterPage

这是一个基于 [Next.js](https://nextjs.org) 的项目，用于展示项目列表、浏览目录并提供下载与下载日志查询功能。

## 快速开始

先确认你的使用场景：

- 只需要维护项目列表数据：不需要 Node.js / npm，直接编辑 `lib/projects.config.json` 即可
- 需要在本地运行项目：需要先安装 Node.js（会自带 npm）

### 1) 安装 Node.js

- 推荐版本：Node.js 20 LTS 或以上
- 官方下载地址：https://nodejs.org/

安装完成后，打开终端执行：

```bash
node -v
npm -v
```

能看到版本号就说明安装成功。

### 2) 安装项目依赖

进入项目目录后执行：

```bash
npm install
```

### 3) 启动开发环境

```bash
npm run dev
```
在浏览器打开 [http://localhost:3000](http://localhost:3000) 查看页面。

## 常用命令

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## 修改项目数据

项目数据配置文件在：

- `lib/projects.config.json`

可以用任意文本编辑器直接修改这个 JSON 文件（记事本、TextEdit、VS Code 等都可以）。

主要字段如下：

- `projectsZh[]`、`projectsEn[]`
  - `id`: 项目标识（用于路由）
  - `title`: 项目标题
  - `description`: 项目描述
  - `tags`: 标签数组
  - `link`: 本地目录绝对路径
- `directoryEntryIgnoreRules`
  - `exactNames`: 精确忽略的文件名
  - `startsWith`: 按前缀忽略（例如 `.`）

注意事项：

- 必须保持 JSON 格式合法（逗号、引号、括号正确）
- 建议不要随意修改 `id`，避免已有链接失效
- `link` 建议填写可访问的绝对路径

## 目录说明

- `app/`: 页面与 API 路由
- `components/`: 前端组件
- `lib/`: 数据与工具逻辑
- `lib/projects.config.json`: 项目配置数据源

## 技术栈

- Next.js
- React
- TypeScript
- Tailwind CSS
