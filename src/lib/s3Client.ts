import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * S3 Client for Supabase Storage
 * Configured to work with Supabase's S3-compatible API
 */
export function createS3Client() {
  const accessKeyId = process.env.ACCESS_KEY_ID;
  const secretAccessKey = process.env.SECRET_ACCESS_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const region = process.env.AWS_REGION || 'us-east-1'; // Default region for S3

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Missing S3 credentials. Please set ACCESS_KEY_ID and SECRET_ACCESS_KEY in your environment variables.');
  }

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable.');
  }

  // Extract project ID from Supabase URL if needed
  // Format: https://project-id.supabase.co/storage/v1/s3
  const s3Endpoint = `${supabaseUrl}/storage/v1/s3`;

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    endpoint: s3Endpoint,
    forcePathStyle: true, // Required for S3-compatible storage
  });
}

/**
 * Uploads a file to S3-compatible storage
 */
export async function uploadFile(
  bucket: string,
  key: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<void> {
  const s3Client = createS3Client();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
}

/**
 * Deletes a file from S3-compatible storage
 */
export async function deleteFile(bucket: string, key: string): Promise<void> {
  const s3Client = createS3Client();

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Generates a signed URL for private file access
 * @param bucket - The bucket name
 * @param key - The file key/path
 * @param expiresIn - URL expiration time in seconds (default: 86400 = 24 hours)
 */
export async function getSignedUrl(
  bucket: string,
  key: string,
  expiresIn: number = 86400
): Promise<string> {
  const s3Client = createS3Client();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const signedUrl = await awsGetSignedUrl(s3Client, command, { expiresIn });
  return signedUrl;
}

/**
 * Extracts the file key from a Supabase Storage URL or signed URL
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    // Handle signed URLs or regular URLs
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // For Supabase storage URLs, the format is typically:
    // /storage/v1/object/[public|sign]/bucket-name/file-key
    // or for S3 paths: /bucket-name/file-key
    
    const bucketIndex = pathParts.indexOf('avatar');
    if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
      // Return everything after the bucket name
      return pathParts.slice(bucketIndex + 1).join('/');
    }
    
    // If it's just a key without full URL
    if (!url.includes('http')) {
      return url;
    }
    
    return null;
  } catch {
    // If URL parsing fails, assume it's just a key
    return url.includes('/') ? url : null;
  }
}

