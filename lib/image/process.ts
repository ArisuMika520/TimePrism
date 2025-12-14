import sharp from "sharp"

/**
 * 处理头像图片：压缩并转换为 WebP 格式
 * @param buffer 
 * @param maxWidth 
 * @param maxHeight 
 * @param quality ）
 * @returns
 */
export async function processAvatarImage(
  buffer: Buffer,
  maxWidth: number = 400,
  maxHeight: number = 400,
  quality: number = 80
): Promise<Buffer> {
  try {
    const processed = await sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality })
      .toBuffer()

    return processed
  } catch (error) {
    console.error("图片处理失败:", error)
    throw new Error("图片处理失败，请检查图片格式")
  }
}

export async function getImageMetadata(buffer: Buffer) {
  try {
    const metadata = await sharp(buffer).metadata()
    return metadata
  } catch (error) {
    console.error("获取图片元数据失败:", error)
    return null
  }
}



