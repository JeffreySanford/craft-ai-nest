import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { from, lastValueFrom, Observable } from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';
import { Response } from 'supertest';
import type { Express } from 'express';

// Improved type for supertest response with body
interface TypedResponse<T = unknown> extends Response {
  body: T;
}

// Define the upload response type
interface UploadResponse {
  id: string;
}

describe('AppController (e2e)', () => {
  let app: INestApplication;

  // Create the app before each test using an Observable
  beforeEach(() => {
    // Create an Observable for module compilation
    return lastValueFrom(
      from(
        Test.createTestingModule({
          imports: [AppModule],
        }).compile(),
      ).pipe(
        // Initialize the app
        mergeMap((moduleFixture: TestingModule) => {
          app = moduleFixture.createNestApplication();
          return from(app.init());
        }),
        // Log successful initialization
        tap(() => console.warn('Application initialized for testing')),
      ),
    );
  });

  it('/ (GET)', () => {
    // Create an Observable for the HTTP request with explicit types
    const request$ = from(
      request(app.getHttpServer() as Express)
        .get('/')
        .expect(200)
        .expect('Hello World!'),
    );

    // Execute the Observable and return the Promise to Jest
    return lastValueFrom(request$);
  });

  // Add a test for uploading files with user headers
  it('/graphics (POST) should accept user information in headers', () => {
    // Create a small test image buffer
    const imageBuffer = Buffer.from(
      'GIF89a\x01\x00\x01\x00\x00\xff\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x00;',
      'binary',
    );

    // Create an Observable for the file upload request with explicit type
    const upload$: Observable<TypedResponse<UploadResponse>> = from(
      request(app.getHttpServer() as Express)
        .post('/graphics')
        .set('x-user-id', 'n057')
        .set('x-username', 'jsmith')
        .set('x-session-id', 'test-session')
        .attach('file', imageBuffer, 'test-image.gif')
        .expect(201),
    ).pipe(
      // Verify the response contains an ID with proper typing
      tap((res: TypedResponse<UploadResponse>) => {
        expect(res.body.id).toBeDefined();
      }),
      // Log successful upload
      tap((res: TypedResponse<UploadResponse>) => {
        console.warn(`Image uploaded successfully with ID: ${res.body.id}`);
      }),
    );

    // Execute the Observable and return the Promise to Jest
    return lastValueFrom(upload$);
  });

  afterAll(() => {
    // Clean up resources using an Observable
    return lastValueFrom(
      from(app.close()).pipe(tap(() => console.warn('Application closed'))),
    );
  });
});
