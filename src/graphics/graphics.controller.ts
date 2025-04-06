import {
  Controller,
  Get,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
  HttpException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GraphicsService } from './graphics.service';
import { Response, Request } from 'express';
import { Observable, throwError, of, Subscription } from 'rxjs';
import { catchError, map, mergeMap, finalize, tap } from 'rxjs/operators';
import { OnModuleDestroy } from '@nestjs/common';
import { GraphicFile, UploadResponse } from './graphics.types';
import { LoggerService, LogLevel } from '../logger/logger.service';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

/**
 * Type guard to validate that a file has required properties
 */
function isValidGraphicFile(file: unknown): file is GraphicFile {
  return (
    !!file &&
    typeof file === 'object' &&
    'originalname' in file &&
    'buffer' in file &&
    'mimetype' in file &&
    Buffer.isBuffer((file as GraphicFile).buffer) &&
    typeof (file as GraphicFile).originalname === 'string' &&
    typeof (file as GraphicFile).mimetype === 'string'
  );
}

@ApiTags('graphics')
@Controller('graphics')
export class GraphicsController implements OnModuleDestroy {
  private activeSubscriptions: Set<Subscription> = new Set();
  private readonly CONTEXT = 'GraphicsController';

  constructor(
    private readonly graphicsService: GraphicsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.info(`Graphics controller initialized`, this.CONTEXT);
  }

  onModuleDestroy(): void {
    const count = this.activeSubscriptions.size;
    // Clean up all active subscriptions when the module is destroyed
    this.activeSubscriptions.forEach((sub) => {
      if (!sub.closed) {
        sub.unsubscribe();
      }
    });
    this.logger.info(`Cleaned up ${count} active subscriptions`, this.CONTEXT);
    this.activeSubscriptions.clear();
  }

  /**
   * Provides a simple HTML upload form for testing purposes
   */
  @Get('upload')
  @ApiOperation({
    summary: 'Serves the upload form page',
    description: 'Provides a simple HTML form for testing file uploads',
  })
  @ApiResponse({ status: 200, description: 'Returns the HTML upload form' })
  getUploadForm(@Res() res: Response): void {
    this.logger.debug('Serving upload form page', this.CONTEXT);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Graphics Upload</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              border: 1px solid #ddd;
              border-radius: 5px;
              padding: 20px;
              margin-top: 20px;
            }
            .form-group {
              margin-bottom: 15px;
            }
            label {
              display: block;
              margin-bottom: 5px;
              font-weight: bold;
            }
            button {
              background: #4CAF50;
              color: white;
              padding: 10px 15px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
            }
            .result {
              margin-top: 20px;
              padding: 15px;
              border-radius: 5px;
              display: none;
            }
            .success {
              background-color: #dff0d8;
              border: 1px solid #d6e9c6;
            }
            .error {
              background-color: #f2dede;
              border: 1px solid #ebccd1;
            }
          </style>
        </head>
        <body>
          <h1>Graphics Upload</h1>
          <div class="container">
            <form id="uploadForm" enctype="multipart/form-data">
              <div class="form-group">
                <label for="file">Select Image:</label>
                <input type="file" id="file" name="file" accept="image/*" required>
              </div>
              <button type="submit">Upload</button>
            </form>
            <div id="result" class="result">
              <h3 id="resultTitle"></h3>
              <p id="resultMessage"></p>
              <div id="imagePreview"></div>
            </div>
          </div>
          
          <script>
            document.getElementById('uploadForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              
              const fileInput = document.getElementById('file');
              const formData = new FormData();
              formData.append('file', fileInput.files[0]);
              
              try {
                const response = await fetch('/graphics', {
                  method: 'POST',
                  body: formData
                });
                
                const resultDiv = document.getElementById('result');
                const resultTitle = document.getElementById('resultTitle');
                const resultMessage = document.getElementById('resultMessage');
                const imagePreview = document.getElementById('imagePreview');
                
                resultDiv.style.display = 'block';
                
                if (response.ok) {
                  const data = await response.json();
                  resultDiv.className = 'result success';
                  resultTitle.textContent = 'Upload Successful!';
                  resultMessage.textContent = 'Image ID: ' + data.id;
                  
                  // Add a link to view the image
                  const link = document.createElement('a');
                  link.href = '/graphics/' + data.id;
                  link.textContent = 'View Uploaded Image';
                  link.target = '_blank';
                  imagePreview.innerHTML = '';
                  imagePreview.appendChild(link);
                } else {
                  const error = await response.text();
                  resultDiv.className = 'result error';
                  resultTitle.textContent = 'Upload Failed';
                  resultMessage.textContent = error;
                  imagePreview.innerHTML = '';
                }
              } catch (error) {
                const resultDiv = document.getElementById('result');
                resultDiv.className = 'result error';
                resultDiv.style.display = 'block';
                document.getElementById('resultTitle').textContent = 'Error';
                document.getElementById('resultMessage').textContent = 'An error occurred during upload: ' + error.message;
                document.getElementById('imagePreview').innerHTML = '';
              }
            });
          </script>
        </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
    this.logger.debug('Upload form page served', this.CONTEXT);
  }

  @Post()
  @ApiOperation({ summary: 'Upload a graphic file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The file to upload',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The ID of the uploaded file',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file format' })
  @ApiResponse({ status: 500, description: 'Server error during upload' })
  @UseInterceptors(FileInterceptor('file'))
  uploadGraphic(
    @UploadedFile() uploadedFile: unknown,
    @Req() req: Request,
  ): Observable<UploadResponse> {
    this.logger.debug('Received file upload request', this.CONTEXT);

    // Get user info from headers or use default for demo
    const userId = (req.headers['x-user-id'] as string) || 'n057';
    // Renaming the unused variable with underscore prefix to comply with the eslint rule
    const _username = (req.headers['x-username'] as string) || 'jsmith';

    // Use the type guard to ensure type safety
    if (!isValidGraphicFile(uploadedFile)) {
      // Log audit with compliance tracking for failed upload
      this.logger.audit(
        'Upload failed: Invalid file format or missing required properties',
        LogLevel.ERROR,
        this.CONTEXT,
        {
          userId: userId,
          sessionId: req.headers['x-session-id'] as string,
          origin: req.headers.origin || req.ip,
          action: 'UPLOAD_GRAPHIC',
          status: 'failure',
        },
      );

      return throwError(
        () => new HttpException('Invalid file format', HttpStatus.BAD_REQUEST),
      );
    }

    // Now we have a properly typed file with guaranteed properties
    const file: GraphicFile = uploadedFile;

    this.logger.info(
      `Processing file upload: ${file.originalname} (${file.mimetype}, ${file.buffer.length} bytes)`,
      this.CONTEXT,
    );

    // Create audit log for file upload attempt
    this.logger.audit(
      `File upload initiated: ${file.originalname}`,
      LogLevel.INFO,
      this.CONTEXT,
      {
        userId: userId,
        sessionId: req.headers['x-session-id'] as string,
        origin: req.headers.origin || req.ip,
        action: 'UPLOAD_GRAPHIC',
        status: 'attempted',
      },
    );

    return this.graphicsService
      .uploadGraphic(file.originalname, file.buffer, file.mimetype)
      .pipe(
        tap((id) => {
          this.logger.debug(`Generated graphic ID: ${id}`, this.CONTEXT);

          // Create audit log for successful upload with resource ID
          this.logger.audit(
            `File upload successful: ${file.originalname} (ID: ${id})`,
            LogLevel.INFO,
            this.CONTEXT,
            {
              userId: userId,
              sessionId: req.headers['x-session-id'] as string,
              origin: req.headers.origin || req.ip,
              resourceId: id,
              action: 'UPLOAD_GRAPHIC',
              status: 'success',
            },
          );
        }),
        map((id) => ({ id })),
        catchError((err: Error) => {
          this.logger.error(`Upload failed: ${err.message}`, this.CONTEXT, err);

          // Create audit log for failed upload
          this.logger.audit(
            `File upload failed: ${file.originalname} - ${err.message}`,
            LogLevel.ERROR,
            this.CONTEXT,
            {
              userId: userId,
              sessionId: req.headers['x-session-id'] as string,
              origin: req.headers.origin || req.ip,
              action: 'UPLOAD_GRAPHIC',
              status: 'failure',
            },
          );

          return throwError(
            () =>
              new HttpException(
                'Failed to upload graphic',
                HttpStatus.INTERNAL_SERVER_ERROR,
              ),
          );
        }),
      );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a graphic file by ID',
    description: 'Streams the file content with appropriate Content-Type',
  })
  @ApiParam({ name: 'id', description: 'Graphic file ID' })
  @ApiResponse({ status: 200, description: 'Returns the file content' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 500, description: 'Server error' })
  getGraphic(@Param('id') id: string, @Res() res: Response): void {
    this.logger.debug(`Retrieving graphic with ID: ${id}`, this.CONTEXT);

    const subscription = this.graphicsService
      .getGraphicStream(id)
      .pipe(
        mergeMap((stream) => {
          return new Observable((observer) => {
            // Attempt to discover the content type from GridFS metadata
            interface StreamWithContentType {
              contentType?: string;
            }

            const contentType =
              'contentType' in stream &&
              typeof (stream as StreamWithContentType).contentType === 'string'
                ? (stream as StreamWithContentType).contentType
                : 'application/octet-stream';

            this.logger.debug(
              `Content type for graphic ${id}: ${contentType}`,
              this.CONTEXT,
            );

            // Set appropriate headers
            res.setHeader(
              'Content-Type',
              contentType || 'application/octet-stream',
            );
            res.setHeader('Cache-Control', 'max-age=3600');

            // Handle stream events
            stream.on('error', (err) => {
              this.logger.error(
                `Error streaming graphic ${id}: ${err.message}`,
                this.CONTEXT,
                err,
              );
              if (!res.headersSent) {
                res.status(HttpStatus.NOT_FOUND).send('Graphic not found');
              }
              observer.error(err);
            });

            stream.on('end', () => {
              this.logger.info(
                `Successfully streamed graphic ${id}`,
                this.CONTEXT,
              );
              observer.complete();
            });

            stream.pipe(res);

            return () => {
              if (!stream.destroyed) {
                this.logger.debug(
                  `Cleaning up stream resources for graphic ${id}`,
                  this.CONTEXT,
                );
                stream.destroy();
              }
            };
          });
        }),
        catchError((error: Error) => {
          this.logger.error(
            `Failed to get graphic ${id}: ${error.message}`,
            this.CONTEXT,
            error,
          );
          if (!res.headersSent) {
            res
              .status(HttpStatus.INTERNAL_SERVER_ERROR)
              .send('Error retrieving graphic');
          }
          return of(null);
        }),
        finalize(() => {
          // Remove the subscription from the active set when complete
          this.logger.debug(
            `Cleaning up subscription for graphic ${id}`,
            this.CONTEXT,
          );
          this.activeSubscriptions.delete(subscription);
        }),
      )
      .subscribe({
        error: (err) =>
          this.logger.error(
            `Unhandled error for graphic ${id}: ${err instanceof Error ? err.message : String(err)}`,
            this.CONTEXT,
            err,
          ),
      });

    // Track the subscription
    this.activeSubscriptions.add(subscription);
    this.logger.debug(
      `Added subscription for graphic ${id}, total active: ${this.activeSubscriptions.size}`,
      this.CONTEXT,
    );
  }
}
