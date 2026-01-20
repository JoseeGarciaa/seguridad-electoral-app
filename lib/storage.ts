const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local'

interface UploadResult {
  url: string
  path: string
}

// GitHub Storage
async function uploadToGitHub(file: Buffer, filename: string, folder: string): Promise<UploadResult> {
  const repo = process.env.GITHUB_STORAGE_REPO
  const token = process.env.GITHUB_STORAGE_TOKEN
  const branch = process.env.GITHUB_STORAGE_BRANCH || 'main'
  const basePath = process.env.GITHUB_STORAGE_BASE_PATH || 'vote-evidence'
  const baseUrl = process.env.GITHUB_STORAGE_PUBLIC_BASE_URL
  
  if (!repo || !token || !baseUrl) {
    throw new Error('GitHub storage not configured')
  }
  
  const path = `${basePath}/${folder}/${filename}`
  const content = file.toString('base64')
  
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Upload ${filename}`,
      content,
      branch,
    }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GitHub upload failed: ${error}`)
  }
  
  const url = `${baseUrl}/${basePath}/${folder}/${filename}`
  return { url, path }
}

// S3 Compatible Storage
async function uploadToS3(file: Buffer, filename: string, folder: string): Promise<UploadResult> {
  const bucket = process.env.S3_BUCKET_NAME
  const region = process.env.S3_REGION
  const accessKey = process.env.S3_ACCESS_KEY_ID
  const secretKey = process.env.S3_SECRET_ACCESS_KEY
  const endpoint = process.env.S3_ENDPOINT
  const baseUrl = process.env.S3_PUBLIC_BASE_URL
  
  if (!bucket || !region || !accessKey || !secretKey) {
    throw new Error('S3 storage not configured')
  }
  
  // For S3, we use the AWS SDK or a compatible library
  // This is a simplified implementation - in production, use @aws-sdk/client-s3
  const path = `${folder}/${filename}`
  
  // Placeholder for S3 upload logic
  // In production, implement using AWS SDK
  const url = baseUrl ? `${baseUrl}/${path}` : `https://${bucket}.s3.${region}.amazonaws.com/${path}`
  
  return { url, path }
}

// Local Storage (fallback for development)
async function uploadToLocal(file: Buffer, filename: string, folder: string): Promise<UploadResult> {
  const fs = await import('fs/promises')
  const path = await import('path')
  
  const uploadsRoot = process.env.LOCAL_UPLOADS_ROOT || './public/vote-evidence'
  const baseUrl = process.env.LOCAL_UPLOADS_BASE_URL || '/vote-evidence'
  
  const fullPath = path.join(uploadsRoot, folder)
  await fs.mkdir(fullPath, { recursive: true })
  
  const filePath = path.join(fullPath, filename)
  await fs.writeFile(filePath, file)
  
  const url = `${baseUrl}/${folder}/${filename}`
  return { url, path: filePath }
}

export async function uploadFile(
  file: Buffer,
  filename: string,
  folder: string = 'evidence'
): Promise<UploadResult> {
  const timestamp = Date.now()
  const sanitizedFilename = `${timestamp}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  
  switch (STORAGE_PROVIDER) {
    case 'github':
      return uploadToGitHub(file, sanitizedFilename, folder)
    case 's3':
      return uploadToS3(file, sanitizedFilename, folder)
    case 'local':
    default:
      return uploadToLocal(file, sanitizedFilename, folder)
  }
}

export function getStorageProvider(): string {
  return STORAGE_PROVIDER
}
