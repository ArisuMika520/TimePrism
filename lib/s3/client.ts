import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { getS3Config, getFileUrl } from "./config"

let s3Client: S3Client | null = null

export function getS3Client(): S3Client {
  if (s3Client) {
    return s3Client
  }

  const config = getS3Config()

  let endpoint = config.endpoint
  if (!endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
    endpoint = `https://${endpoint}`
  }

  s3Client = new S3Client({
    endpoint: endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  })

  return s3Client
}

export async function uploadFile(
  file: Buffer,
  key: string,
  contentType: string,
  retries: number = 3
): Promise<string> {
  const client = getS3Client()
  const config = getS3Config()

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: file,
    ContentType: contentType,
  })

  let lastError: Error | null = null
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await client.send(command)
      return key
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`S3上传失败 (尝试 ${attempt}/${retries}):`, {
        message: lastError.message,
        code: error?.Code || error?.code,
        statusCode: error?.$metadata?.httpStatusCode,
        key,
        bucket: config.bucketName,
      })
      if (attempt < retries) {
        const delay = Math.pow(2, attempt - 1) * 100
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw new Error(`上传文件失败（重试 ${retries} 次）: ${lastError?.message}`)
}

export async function deleteFile(key: string, retries: number = 3): Promise<void> {
  const client = getS3Client()
  const config = getS3Config()

  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  })

  let lastError: Error | null = null
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await client.send(command)
      return
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < retries) {
        const delay = Math.pow(2, attempt - 1) * 100
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw new Error(`删除文件失败（重试 ${retries} 次）: ${lastError?.message}`)
}

export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client()
  const config = getS3Config()

  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  })

  try {
    return await getSignedUrl(client, command, { expiresIn })
  } catch (error) {
    throw new Error(`生成预签名URL失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function fileExists(key: string): Promise<boolean> {
  const client = getS3Client()
  const config = getS3Config()

  const command = new HeadObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  })

  try {
    await client.send(command)
    return true
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false
    }
    throw error
  }
}

export { getFileUrl }

