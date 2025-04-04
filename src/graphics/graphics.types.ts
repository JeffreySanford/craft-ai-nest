import { Request } from 'express';

export interface GraphicFile extends Express.Multer.File {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
}

// You can add more specific types for your graphics system here
export interface UploadResponse {
  id: string;
}

// Optional: Type for the MulterOptions if you need to customize file upload limits
export interface GraphicsMulterOptions {
  limits?: {
    fileSize?: number; // e.g., 5MB = 5 * 1024 * 1024
    files?: number; // Maximum number of files
  };
  fileFilter?: (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => void;
}
