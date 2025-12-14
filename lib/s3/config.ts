export interface S3Config {
  bucketName: string
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  cdnUrl?: string
  region?: string
}

export function getS3Config(): S3Config {
  const config: S3Config = {
    bucketName: process.env.S3_BUCKET_NAME || "",
    endpoint: process.env.S3_ENDPOINT || "",
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    cdnUrl: process.env.S3_CDN_URL,
    region: process.env.S3_REGION || "auto",
  }

  if (!config.bucketName || !config.endpoint || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error("S3配置不完整，请检查环境变量")
  }

  return config
}

export function getFileUrl(key: string): string {
  const config = getS3Config()
  
  if (config.cdnUrl) {
    return `${config.cdnUrl}/${key}`
  }
  
  return `${config.endpoint}/${config.bucketName}/${key}`
}

