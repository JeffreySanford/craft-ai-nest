import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { LoggerService } from '../../logger/logger.service';
import { performance } from 'perf_hooks';

@Injectable()
export class TemplateService {
  private readonly CONTEXT = 'TemplateService';
  private templateCache: Map<string, string> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;
  private totalRenderTime = 0;
  private renderCount = 0;

  constructor(private readonly logger: LoggerService) {
    this.logger.info('Initializing TemplateService', this.CONTEXT);

    // Log environment configuration for templates
    const cacheEnabled = process.env.NODE_ENV === 'production';
    this.logger.info(
      `Template cache is ${cacheEnabled ? 'enabled' : 'disabled'} by default (${process.env.NODE_ENV} environment)`,
      this.CONTEXT,
    );

    // Log template directory path for verification
    const templateDir = join(process.cwd(), 'src/views');
    this.logger.debug(`Template directory path: ${templateDir}`, this.CONTEXT);
  }

  /**
   * Render a template with optional data substitution
   * @param templatePath Path to the template relative to views directory
   * @param data Optional data to substitute in the template
   * @param useCache Whether to use cached templates (default: true in production)
   */
  async render(
    templatePath: string,
    data: Record<string, unknown> = {},
    useCache = process.env.NODE_ENV === 'production',
  ): Promise<string> {
    const startTime = performance.now();
    this.logger.debug(`Rendering template: ${templatePath}`, this.CONTEXT);
    this.logger.debug(
      `Template data keys: ${Object.keys(data).join(', ') || 'none'}`,
      this.CONTEXT,
    );

    let template: string;
    const cacheKey = templatePath;
    let cacheStatus = 'disabled';

    // Try to get from cache first
    if (useCache) {
      if (this.templateCache.has(cacheKey)) {
        this.cacheHits++;
        cacheStatus = 'hit';
        this.logger.debug(
          `Cache hit for template: ${templatePath} (hit rate: ${this.getCacheHitRate().toFixed(2)}%)`,
          this.CONTEXT,
        );
        template = this.templateCache.get(cacheKey)!;
      } else {
        this.cacheMisses++;
        cacheStatus = 'miss';
        this.logger.debug(
          `Cache miss for template: ${templatePath} (hit rate: ${this.getCacheHitRate().toFixed(2)}%)`,
          this.CONTEXT,
        );
        template = await this.loadTemplateFromFile(templatePath);

        // Cache the template for future use
        this.templateCache.set(cacheKey, template);
        this.logger.debug(
          `Cached template: ${templatePath} (cache size: ${this.templateCache.size})`,
          this.CONTEXT,
        );
      }
    } else {
      template = await this.loadTemplateFromFile(templatePath);
    }

    // Process template (substitute variables)
    const numVars = Object.keys(data).length;
    this.logger.debug(
      `Processing template with ${numVars} variables`,
      this.CONTEXT,
    );

    const result = this.processTemplate(template, data);

    // Calculate and log performance metrics
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    this.totalRenderTime += renderTime;
    this.renderCount++;
    const avgRenderTime = this.totalRenderTime / this.renderCount;

    this.logger.info(
      `Template rendered: ${templatePath} (${renderTime.toFixed(2)}ms, cache: ${cacheStatus})`,
      this.CONTEXT,
    );
    this.logger.debug(
      `Render stats: current=${renderTime.toFixed(2)}ms, avg=${avgRenderTime.toFixed(2)}ms, count=${this.renderCount}`,
      this.CONTEXT,
    );

    return result;
  }

  /**
   * Load a template from the filesystem
   * @private
   */
  private async loadTemplateFromFile(templatePath: string): Promise<string> {
    try {
      const startTime = performance.now();
      const fullPath = join(process.cwd(), 'src/views', templatePath);

      this.logger.debug(
        `Loading template from path: ${fullPath}`,
        this.CONTEXT,
      );

      const template = await readFile(fullPath, 'utf8');

      const loadTime = performance.now() - startTime;
      this.logger.debug(
        `Template loaded: ${templatePath} (${template.length} bytes, ${loadTime.toFixed(2)}ms)`,
        this.CONTEXT,
      );

      return template;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Provide a more specific error message based on common filesystem errors
      if (errorMessage.includes('ENOENT')) {
        this.logger.error(
          `Template file not found: ${templatePath}`,
          this.CONTEXT,
          error,
        );
        throw new Error(`Template not found: ${templatePath}`);
      } else if (errorMessage.includes('EACCES')) {
        this.logger.error(
          `Permission denied accessing template: ${templatePath}`,
          this.CONTEXT,
          error,
        );
        throw new Error(
          `Permission denied accessing template: ${templatePath}`,
        );
      } else {
        this.logger.error(
          `Failed to load template ${templatePath}: ${errorMessage}`,
          this.CONTEXT,
          error,
        );
        throw new Error(`Error loading template: ${templatePath}`);
      }
    }
  }

  /**
   * Process a template string by replacing placeholders with values
   * @private
   */
  private processTemplate(
    template: string,
    data: Record<string, unknown>,
  ): string {
    const replacementCount = { count: 0 };

    const result = template.replace(
      /\{\{\s*(\w+)\s*\}\}/g,
      (match, key: string) => {
        if (data[key] !== undefined) {
          replacementCount.count++;
          // Fix redundant type checking
          return typeof data[key] === 'object'
            ? JSON.stringify(data[key])
            : JSON.stringify(data[key]);
        }
        // Log missing template variables as warnings
        this.logger.warn(
          `Missing template variable: ${key} in template`,
          this.CONTEXT,
        );
        return match; // Keep the placeholder if no value is provided
      },
    );

    this.logger.debug(
      `Template variable replacements: ${replacementCount.count}`,
      this.CONTEXT,
    );

    return result;
  }

  /**
   * Clear the template cache
   */
  clearCache(): void {
    const previousSize = this.templateCache.size;
    this.logger.info(
      `Clearing template cache (${previousSize} entries)`,
      this.CONTEXT,
    );

    this.templateCache.clear();

    this.logger.debug(`Template cache cleared successfully`, this.CONTEXT);
  }

  /**
   * Calculate cache hit rate percentage
   * @private
   */
  private getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    if (total === 0) {
      return 0;
    }
    return (this.cacheHits / total) * 100;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): Record<string, unknown> {
    const stats = {
      cacheSize: this.templateCache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: this.getCacheHitRate(),
      renderCount: this.renderCount,
      avgRenderTime:
        this.renderCount > 0 ? this.totalRenderTime / this.renderCount : 0,
    };

    this.logger.info(
      `Template cache stats: ${JSON.stringify(stats)}`,
      this.CONTEXT,
    );
    return stats;
  }
}
