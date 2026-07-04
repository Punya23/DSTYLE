export function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

export function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(url) || url.includes("cloudinary.com");
}
