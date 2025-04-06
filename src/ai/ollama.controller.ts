import { Body, Controller, Post, Res, Headers } from '@nestjs/common';
import { Response } from 'express';
import { OllamaService } from './ollama.service';
import { LoggerService } from '../logger/logger.service';
import { firstValueFrom } from 'rxjs';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';

// Define interface for completion request body
interface CompletionRequest {
  prompt: string;
  model?: string;
}

@ApiTags('ai')
@Controller('ai')
export class OllamaController {
  constructor(
    private readonly ollamaService: OllamaService,
    private readonly logger: LoggerService,
  ) {}

  @Post('complete')
  @ApiOperation({
    summary: 'Generate AI completions based on prompts',
    description:
      'Sends a prompt to the AI model and returns the generated completion',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          example: 'How to write a TypeScript function that sorts an array?',
          description: 'The prompt to complete',
        },
        model: {
          type: 'string',
          example: 'codellama:13b',
          description: 'Optional model name to use (defaults to codellama:13b)',
        },
      },
      required: ['prompt'],
    },
  })
  @ApiHeader({
    name: 'x-request-id',
    required: false,
    description: 'Optional request ID for tracking',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the AI completion',
    schema: {
      type: 'object',
      properties: {
        completion: {
          type: 'string',
          description: 'The generated completion text',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid prompt provided' })
  @ApiResponse({ status: 500, description: 'AI processing error' })
  async complete(
    @Body() completionRequest: CompletionRequest,
    @Res() res: Response,
    @Headers('x-request-id') _requestId?: string,
  ): Promise<void> {
    const { prompt } = completionRequest;

    if (!prompt || typeof prompt !== 'string') {
      this.logger.warn('Invalid prompt provided', 'OllamaController');
      res.status(400).json({ error: 'Invalid prompt provided' });
      return;
    }

    try {
      const result = await firstValueFrom(this.ollamaService.invokeAI(prompt));
      res.json({ completion: result });
    } catch (error) {
      this.logger.error(
        `Error in AI completion: ${error instanceof Error ? error.message : String(error)}`,
        'OllamaController',
        error,
      );
      res.status(500).json({ error: 'AI processing error' });
    }
  }
}
