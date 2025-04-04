import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';
import { Observable, from, defer } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class GraphicsService {
  private bucket: GridFSBucket;
  private readonly CONTEXT = 'GraphicsService';

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly logger: LoggerService,
  ) {
    this.logger.info('Initializing GraphicsService', this.CONTEXT);

    if (!this.connection.db) {
      this.logger.error('Database connection is not initialized', this.CONTEXT);
      throw new Error('Database connection is not initialized.');
    }

    try {
      this.bucket = new GridFSBucket(this.connection.db, {
        bucketName: 'graphics',
      });
      this.logger.info('GridFS bucket initialized successfully', this.CONTEXT);
    } catch (error) {
      this.logger.error(
        `Failed to initialize GridFS bucket: ${error instanceof Error ? error.message : String(error)}`,
        this.CONTEXT,
        error,
      );
      throw error;
    }
  }

  uploadGraphic(
    filename: string,
    buffer: Buffer,
    mimeType: string,
  ): Observable<string> {
    this.logger.info(
      `Starting graphic upload: ${filename}, size: ${buffer.length} bytes, type: ${mimeType}`,
      this.CONTEXT,
    );

    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);

    return new Observable<string>((observer) => {
      this.logger.debug(`Creating upload stream for ${filename}`, this.CONTEXT);

      const uploadStream = this.bucket.openUploadStream(filename, {
        contentType: mimeType,
      });

      uploadStream.on('error', (err) => {
        this.logger.error(
          `Failed uploading graphic ${filename}: ${err.message}`,
          this.CONTEXT,
          err,
        );
        observer.error(err);
      });

      uploadStream.on('finish', () => {
        const id = uploadStream.id.toString();
        this.logger.info(`Uploaded graphic with id: ${id}`, this.CONTEXT);
        this.logger.debug(
          `Upload size: ${buffer.length} bytes, filename: ${filename}`,
          this.CONTEXT,
        );
        observer.next(id);
        observer.complete();
      });

      readableStream.pipe(uploadStream);
      this.logger.debug(
        `Streaming data to GridFS for ${filename}`,
        this.CONTEXT,
      );

      return () => {
        // Cleanup logic only executed if the observer is unsubscribed before completion
        if (!uploadStream.destroyed) {
          this.logger.debug(
            `Cleaning up upload resources for ${filename}`,
            this.CONTEXT,
          );
          uploadStream.destroy();
        }
      };
    }).pipe(
      tap((id) =>
        this.logger.info(`Upload complete for graphic ID: ${id}`, this.CONTEXT),
      ),
    );
  }

  getGraphicStream(id: string): Observable<Readable> {
    this.logger.info(`Retrieving graphic with ID: ${id}`, this.CONTEXT);

    return defer(() => {
      try {
        this.logger.debug(
          `Opening download stream for ID: ${id}`,
          this.CONTEXT,
        );
        const stream = this.bucket.openDownloadStream(new ObjectId(id));
        this.logger.debug(
          `Opened download stream for graphic ID: ${id}`,
          this.CONTEXT,
        );
        return from([stream]);
      } catch (error: unknown) {
        if (error instanceof Error) {
          this.logger.error(
            `Failed to open download stream for ${id}: ${error.message}`,
            this.CONTEXT,
            error,
          );
        } else {
          this.logger.error(
            `Failed to open download stream for ${id}: Unknown error`,
            this.CONTEXT,
            error,
          );
        }
        throw error;
      }
    });
  }
}
