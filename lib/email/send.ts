import nodemailer from "nodemailer"

// 创建邮件传输器
const createTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  }

  return nodemailer.createTransport(config)
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const transporter = createTransporter()

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || "TimePrism"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ""), // 简单地移除HTML标签作为纯文本备用
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    throw error
  }
}

// 发送验证码邮件
export async function sendVerificationCode(email: string, code: string) {
  const subject = "TimePrism 邮箱验证码"
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .code-box { background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TimePrism</h1>
            <p>邮箱验证码</p>
          </div>
          <div class="content">
            <p>您好，</p>
            <p>您正在注册 TimePrism 账户，以下是您的验证码：</p>
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            <p><strong>验证码将在 10 分钟后过期。</strong></p>
            <p>如果这不是您的操作，请忽略此邮件。</p>
            <div class="footer">
              <p>© 2025 TimePrism. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `

  return sendEmail({ to: email, subject, html })
}
