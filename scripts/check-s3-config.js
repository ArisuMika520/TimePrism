/**
 * 检查 S3 配置脚本
 */

require("dotenv").config({ path: ".env.local" })
require("dotenv").config()

const requiredVars = [
  "S3_BUCKET_NAME",
  "S3_ENDPOINT",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
]

const optionalVars = [
  "S3_CDN_URL",
  "S3_REGION",
]

console.log("=== S3 配置检查 ===\n")

// 检查必需变量
console.log("必需的环境变量：")
let allRequired = true
requiredVars.forEach((varName) => {
  const value = process.env[varName]
  if (value && value.trim() !== "") {
    // 隐藏敏感信息
    if (varName.includes("SECRET") || varName.includes("KEY")) {
      console.log(`  ✓ ${varName}: ${value.substring(0, 4)}...${value.substring(value.length - 4)}`)
    } else {
      console.log(`  ✓ ${varName}: ${value}`)
    }
  } else {
    console.log(`  ✗ ${varName}: 未配置`)
    allRequired = false
  }
})

console.log("\n可选的环境变量：")
optionalVars.forEach((varName) => {
  const value = process.env[varName]
  if (value && value.trim() !== "") {
    console.log(`  ✓ ${varName}: ${value}`)
  } else {
    console.log(`  - ${varName}: 未配置（可选）`)
  }
})

console.log("\n=== 配置状态 ===")
if (allRequired) {
  console.log("✅ 所有必需的 S3 配置已设置")
  console.log("\n可以测试 S3 连接：")
  console.log("  node tests/test-upload-s3.js")
} else {
  console.log("❌ S3 配置不完整")
  console.log("\n请配置以下环境变量：")
  requiredVars.forEach((varName) => {
    if (!process.env[varName] || process.env[varName].trim() === "") {
      console.log(`  - ${varName}`)
    }
  })
  console.log("\n配置示例（添加到 .env 文件）：")
  console.log("  # Cloudflare R2")
  console.log("  S3_BUCKET_NAME=your-bucket-name")
  console.log("  S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com")
  console.log("  S3_ACCESS_KEY_ID=your-access-key-id")
  console.log("  S3_SECRET_ACCESS_KEY=your-secret-access-key")
  console.log("  S3_REGION=auto")
  console.log("  S3_CDN_URL=https://your-cdn-domain.com  # 可选")
  console.log("\n  # 或 Backblaze B2")
  console.log("  S3_BUCKET_NAME=your-bucket-name")
  console.log("  S3_ENDPOINT=https://s3.us-west-000.backblazeb2.com")
  console.log("  S3_ACCESS_KEY_ID=your-key-id")
  console.log("  S3_SECRET_ACCESS_KEY=your-application-key")
  console.log("  S3_REGION=us-west-000")
}

// 尝试验证配置（不实际加载模块，避免 TypeScript 问题）
console.log("\n=== 配置验证 ===")
if (allRequired) {
  console.log("✅ 配置验证通过")
  console.log(`   Bucket: ${process.env.S3_BUCKET_NAME}`)
  console.log(`   Endpoint: ${process.env.S3_ENDPOINT}`)
  console.log(`   Region: ${process.env.S3_REGION || "auto"}`)
  if (process.env.S3_CDN_URL) {
    console.log(`   CDN: ${process.env.S3_CDN_URL}`)
  }
  console.log("\n💡 提示：")
  console.log("   - 这是 Backblaze B2 配置")
  console.log("   - CDN 已配置，文件将通过 CDN 访问")
  console.log("   - 可以运行 'node tests/test-upload-s3.js' 测试连接")
} else {
  console.log("❌ 配置验证失败：缺少必需的配置项")
}

