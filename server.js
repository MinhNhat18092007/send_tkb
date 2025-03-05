import express from "express";
import cors from "cors";
import fs from "fs";
import cron from "node-cron";
import { Zalo, ThreadType } from "zca-js";

const app = express();
app.use(cors());
app.use(express.json());

const zalo = new Zalo({
    selfListen: false,
    checkUpdate: true,
    logging: true
});

// Đọc cookie từ file
const cookie = JSON.parse(fs.readFileSync("./cookie.json", "utf-8"));

// Đăng nhập Zalo
async function loginZalo() {
    return await zalo.login({
        cookie: cookie,
        imei: "4fa11867-1da1-4f06-9fe3-ca7237c628fc-9258db5fffd4f17a8703a19e760af505",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0"
    });
}

// Lưu danh sách người dùng đã đăng ký nhận thông báo
const userSchedule = {};

// 📚 Thời khóa biểu mới của lớp 12A1
const timetable = {
    "Thứ 2": "📖 Môn học hôm nay: GDTNHN, Toán, Toán, GDGP, Ngoại ngữ\n👕 Hôm nay mặc áo **trắng** nhé!",
    "Thứ 3": "📚 Môn học hôm nay: Ngoại ngữ, Hóa, Lý, Tin, Văn\n👕 Hôm nay mặc áo **Đoàn** nhé!",
    "Thứ 4": "📖 Môn học hôm nay: Ngoại ngữ, Sinh học, Toán, Hóa\n👕 Hôm nay mặc áo **trắng** nhé!",
    "Thứ 5": "🏃‍♂️ Môn học hôm nay: Tin, Thể dục, Lý, Sử, Hóa\n👕 Hôm nay mặc áo **trắng** nhé!",
    "Thứ 6": "📖 Môn học hôm nay: Văn, GDTN, Thể dục, GDQP\n👕 Hôm nay mặc áo **Đoàn** nhé!",
    "Thứ 7": "📚 Môn học hôm nay: Sinh, Văn, Lý, Toán, GDTNHN\n👕 Hôm nay mặc áo **trắng** nhé!",
    "Chủ Nhật": "🎉 Nghỉ ngơi thôi! Chúc bạn có một ngày Chủ Nhật thư giãn!"
};

// 🚀 API đăng ký nhận thông báo
app.post("/register", async (req, res) => {
    const { phone, notifyTime } = req.body;

    if (!phone || !notifyTime) {
        return res.status(400).json({ message: "Vui lòng nhập số điện thoại và thời gian!" });
    }

    // Chuyển thời gian từ "hh:mm AM/PM" sang cron format "mm hh * * *"
    const [time, period] = notifyTime.split(" ");
    const [hour, minute] = time.split(":").map(Number);
    const cronHour = period.toLowerCase() === "pm" && hour !== 12 ? hour + 12 : hour % 12;
    const cronTime = `${minute} ${cronHour} * * *`;

    try {
        const api = await loginZalo();
        const userInfo = await api.findUser(phone);

        if (!userInfo || !userInfo.uid) {
            return res.status(400).json({ message: "Không tìm thấy tài khoản Zalo!" });
        }

        const userId = userInfo.uid;
        userSchedule[userId] = cronTime; // Lưu thời gian nhận thông báo

        // Lập lịch gửi tin nhắn
        cron.schedule(cronTime, async () => {
            const days = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
            const today = days[new Date().getDay()];
            const message = timetable[today] || "Không có lịch học";

            // 🌟 Thêm động lực mỗi ngày với sticker
            const motivationStickers = [
                "🚀 Hãy bắt đầu ngày mới thật năng lượng nhé! 💪",
                "💡 Kiến thức là sức mạnh! Học tập chăm chỉ nào! 📚",
                "🔥 Cố gắng hôm nay, thành công ngày mai! 🎯",
                "🌱 Học tập là hạt giống cho tương lai tươi sáng! ☀️"
            ];
            const motivation = motivationStickers[Math.floor(Math.random() * motivationStickers.length)];
            const finalMessage = `🎓 **Xin chào!**\n📆 Hôm nay là **${today}**\n\n${message}\n\n✨ ${motivation}`;

            try {
                api.listener.start(); // Bắt đầu lắng nghe sự kiện

                var user_if = await api.findUser(phone);
                console.log(user_if); // Kiểm tra xem dữ liệu có đúng không

                if (user_if && user_if.uid) {
                    var user_id = user_if.uid;
                    console.log("User ID:", user_id);

                    api.sendMessage(`📢 ${finalMessage}`, user_id, ThreadType.User)
                        .then(() => console.log("✅ Đã gửi tin nhắn thành công!"))
                        .catch(err => console.error("❌ Lỗi khi gửi tin nhắn:", err));
                } else {
                    console.error("❌ Không tìm thấy thông tin user!");
                }
            } catch (error) {
                console.error("❌ Gửi tin nhắn thất bại:", error.message);
            }
        });

        res.json({ message: `📢 Đã đăng ký nhận thông báo lúc ${notifyTime} mỗi ngày!` });

    } catch (error) {
        res.status(500).json({ message: "Lỗi khi đăng ký: " + error.message });
    }
});

// Khởi chạy server
app.listen(3000, () => console.log("✅ Server đang chạy tại http://localhost:3000"));
