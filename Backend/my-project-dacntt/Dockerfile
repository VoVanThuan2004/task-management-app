# Sử dụng Nodejs base image
FROM node:18-alpine

RUN apk add --no-cache netcat-openbsd

# Tạo thư mục làm việc cho ứng dụng
WORKDIR /app

# Copy package.json và package-lock.json vào thư mục làm việc
COPY package*.json ./
RUN npm install

# Copy toàn bộ mã nguồn vào thư mục làm việc
COPY . .

# Cổng port cho backend
EXPOSE 8080

# Lệnh chạy ứng dụng
CMD ["npm", "start"]