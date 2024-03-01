# Nối từ online


## Giới thiệu

Đây là một trang web cung cấp nền tảng để bạn tham gia vào các trò chơi nối từ thú vị cùng với mọi người. Bằng cách nối các từ có vần điệu, bạn sẽ tạo thành những chuỗi từ có ý nghĩa, kích thích trí tưởng tượng và khả năng sáng tạo.

Công nghệ sử dụng cho website này : [NuxtJS](https://nuxt.com), [Supabase](https://supabase.com/) và [Prisma](https://www.prisma.io/)

Các chức năng chính của website:

1. Hỗ trợ chơi trực tuyến với nhiều người
2. Có thể tham gia giữa trận ngay cả khi phòng đã bắt đầu
3. Đăng nhập / Đăng ký thông qua Google ([Supabase](https://supabase.com/) không hỗ trợ người dùng ảo)

## Cách sử dụng mã nguồn để chạy trên máy

1. Đầu tiên cần đảm bảo rằng máy đã cài đặt 2 thứ sau :

> [!NOTE]
>
> 1. [NodeJS](https://nodejs.org/en)
> 2. [Git](https://git-scm.com/) (không bắt buộc)

2. Sau đó hãy tạo tài khoản supbase và tạo một project trên đó (link video hướng dẫn ở [đây](https://www.youtube.com/watch?v=-jISW-jVG-s))

3. Tiếp đó tải mã nguồn về thông qua nút Download Zip

4. Vào thư mục mã nguồn rồi tạo file `.env` tiếp đó vào file `.env.example` và copy toàn bộ nội dung bên trong đó cho vào file `.env`

5. Vào project đã tạo ở bước 2 xong vô phần setting, xong tiếp vào tab API copy dòng Project URL rồi gán vào SUPABASE_URL, Project API key rồi gán vào dòng SUPABASE_KEY, tiếp đó vào tab copy 2 đường dẫn connection pooling dạng transcation và session rồi lần lượt paste vào 2 dòng DATABASE_URL và DIRECT_URL

6. Mở cmd ở **đúng đường đẫn** rồi bắt đầu gõ lệnh

```bash
# lệnh này dùng để cài các package cần thiết
npm install

# Lệnh này để update db
npx prisma generate

# Lệnh này để bắt đầu serve lên local bắt đầu dùng thử
npm run dev --host
```
