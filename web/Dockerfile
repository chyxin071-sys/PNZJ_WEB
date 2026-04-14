# 使用官方 Node 基础镜像，体积小巧的 Alpine 版本
FROM node:18-alpine AS base

# 安装基础依赖
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 拷贝 package.json 及其 lock 文件
COPY package.json package-lock.json* ./

# 仅安装生产环境依赖，利用缓存
RUN npm ci

# 拷贝所有源代码
COPY . .

# 环境变量设置：在生产模式下运行
ENV NODE_ENV production

# Next.js 构建命令
RUN npm run build

# 暴露给云托管的默认端口（Next.js 默认 3000）
EXPOSE 3000

# 启动 Next.js 生产环境服务器
CMD ["npm", "start"]
