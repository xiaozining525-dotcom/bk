export const API_BASE = '/api';
export const ADMIN_TOKEN_KEY = 'blog_admin_token';

// 1. 背景视频链接
// 请直接在此处填入您的视频直链地址 (以 http 或 https 开头)。
// 推荐使用对象存储 (如 Cloudflare R2, AWS S3, Aliyun OSS) 的公开链接。
// 默认示例链接仅作演示。
export const BACKGROUND_VIDEO_URL = "https://cdn.pixabay.com/video/2023/04/13/158656-817354676_large.mp4"; 

// 2. 背景音乐链接 (可选)
// - 方案 A: 如果视频自带声音且您想使用视频原声，请保持此处为空字符串 ""。
// - 方案 B: 如果您想播放独立的背景音乐 (如 mp3 直链)，请在此填入链接。
export const BACKGROUND_MUSIC_URL = ""; 

export const CATEGORIES = ['技术', '生活', '随笔', '设计'];