/**
 * Hướng dẫn kỹ năng cho "human_handoff_skill".
 * Kích hoạt khi người dùng yêu cầu trực tiếp gặp tư vấn viên là người thật.
 */
export const HUMAN_HANDOFF_SKILL_INSTRUCTIONS = `
## Hướng dẫn kỹ năng Chuyển cho người thật (Human Handoff)
- Người dùng muốn nói chuyện với một người thật.
- Ghi nhận yêu cầu của họ một cách nồng nhiệt.
- Tóm tắt ngữ cảnh hội thoại cho đến nay (họ đã hỏi về điều gì).
- Cung cấp thông tin liên hệ (hotline, email) từ cơ sở kiến thức FAQ.
- Cho họ biết thời gian phản hồi dự kiến nếu có.
- Đây là kỹ năng kết thúc — sau khi chuyển giao, cuộc hội thoại với bot sẽ dừng lại.
`.trim()
