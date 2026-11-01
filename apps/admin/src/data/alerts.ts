import type { AreaAlert, AlertDraft } from "@/types"

const alertsSeed: AreaAlert[] = [
  {
    id: "AL-0189",
    area: "Nguyễn Hữu Cảnh, Bình Thạnh",
    level: "Nghiêm trọng",
    hazardType: "Ngập đường",
    title: "Ngập sâu, hạn chế di chuyển",
    message: "Mực nước đang vượt 40 cm. Người dân tránh lưu thông qua khu vực.",
    startedAt: "17:48",
    expiresAt: "20:30",
    status: "active",
    channels: ["Web", "Push", "Trung tâm điều hành"],
    createdBy: "Nguyễn Minh",
  },
  {
    id: "AL-0188",
    area: "Thảo Điền, TP. Thủ Đức",
    level: "Cảnh báo",
    hazardType: "Mưa lớn",
    title: "Nguy cơ ngập trong 30 phút tới",
    message: "Mưa lớn tiếp diễn, ưu tiên các tuyến đường cao.",
    startedAt: "17:32",
    expiresAt: "20:00",
    status: "active",
    channels: ["Web", "Push"],
    createdBy: "Trần Hoài",
  },
  {
    id: "AL-0186",
    area: "Huỳnh Tấn Phát, Quận 7",
    level: "Cảnh báo",
    hazardType: "Triều cường",
    title: "Mưa lớn kết hợp đỉnh triều",
    message: "Cảnh giác nước dâng tại các đoạn đường trũng.",
    startedAt: "16:55",
    expiresAt: "21:00",
    status: "active",
    channels: ["Web"],
    createdBy: "Nguyễn Minh",
  },
]


const emptyDraft: AlertDraft = {
  area: "",
  level: "Cảnh báo",
  hazardType: "Ngập đường",
  title: "",
  message: "",
  expiresAt: "21:00",
  channels: ["Web", "Push"],
}


export { alertsSeed, emptyDraft }
