const trends = {
  "24h": {
    labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
    reports: [5, 3, 8, 12, 25, 17],
    rain: [14, 9, 18, 27, 61, 44],
    insight: "Đỉnh báo cáo trùng thời điểm mưa lớn lúc 17:30.",
  },
  "7d": {
    labels: ["T2", "T3", "T4", "T5", "T6", "T7"],
    reports: [18, 23, 14, 31, 42, 28],
    rain: [22, 34, 19, 45, 72, 39],
    insight: "Thứ Sáu có lượng mưa và số báo cáo cao nhất tuần.",
  },
  "30d": {
    labels: ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4", "Hôm nay", ""],
    reports: [48, 65, 57, 86, 104, 104],
    rain: [31, 42, 38, 56, 64, 64],
    insight: "Số điểm ngập được ghi nhận tăng 21% trong 7 ngày gần đây.",
  },
}


export { trends }
