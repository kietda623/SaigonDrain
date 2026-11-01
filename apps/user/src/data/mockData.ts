
const forecastSlots = [
  { id: "now", label: "Hiện tại", rain: "8 mm", risk: "Thấp", zone: 0 },
  { id: "30", label: "+30 phút", rain: "34 mm", risk: "Cao", zone: 1 },
  { id: "60", label: "+60 phút", rain: "51 mm", risk: "Rất cao", zone: 2 },
  { id: "90", label: "+90 phút", rain: "23 mm", risk: "Giảm dần", zone: 1 },
] as const

const routes = {
  safe: {
    id: "safe" as const,
    name: "Tuyến đề xuất",
    time: "12 phút",
    distance: "3,4 km",
    badge: "Nhanh nhất",
    detail:
      "Đi theo Võ Thị Sáu, Đường 3 Tháng 2 và Nguyễn Văn Cừ để đến cơ sở chính.",
  },
  balanced: {
    id: "balanced" as const,
    name: "Tuyến dự phòng",
    time: "15 phút",
    distance: "3,9 km",
    badge: "Ít điểm ngập",
    detail:
      "Tuyến dự phòng được sử dụng khi hệ thống ghi nhận ngập trên lộ trình chính.",
  },
}

const CAMPUS_1: [number, number] = [106.6836363, 10.7790693]
const MAIN_CAMPUS: [number, number] = [106.6817595, 10.7597031]

const navigationSteps = [
  {
    icon: "turn-left" as const,
    instruction: "Rẽ trái vào",
    street: "Võ Thị Sáu",
    distance: "220 m",
  },
  {
    icon: "turn-right" as const,
    instruction: "Rẽ phải vào",
    street: "Đường 3 Tháng 2",
    distance: "690 m",
  },
  {
    icon: "turn-left" as const,
    instruction: "Rẽ trái vào",
    street: "Cao Thắng",
    distance: "960 m",
  },
  {
    icon: "turn-right" as const,
    instruction: "Rẽ phải vào",
    street: "Nguyễn Thị Minh Khai",
    distance: "380 m",
  },
  {
    icon: "turn-right" as const,
    instruction: "Đi theo",
    street: "Nguyễn Văn Cừ",
    distance: "780 m",
  },
  {
    icon: "turn-right" as const,
    instruction: "Rẽ phải vào",
    street: "Nguyễn Trãi",
    distance: "210 m",
  },
]


export { forecastSlots, routes, CAMPUS_1, MAIN_CAMPUS, navigationSteps }
