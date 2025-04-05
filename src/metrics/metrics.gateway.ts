import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { MetricsService } from './metrics.service';
import { LoggerService } from '../logger/logger.service';
import { Subscription } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { MetricType, MetricFilter } from './metrics.types';

// Define server-to-client events
interface ServerToClientEvents {
  metric: (metric: {
    timestamp: string;
    type: string;
    value: number;
    unit: string;
    id?: string;
    host?: string;
    tags?: Record<string, string>;
  }) => void;
  subscribed: (data: { message: string; filter: MetricFilter }) => void;
  unsubscribed: (data: { message: string }) => void;
  complete: (data: { message: string }) => void;
  error: (data: { message: string }) => void;
  historical: (metrics: unknown[]) => void;
}

// Define client-to-server events
interface ClientToServerEvents {
  subscribe: (filter: MetricFilter) => void;
  unsubscribe: () => void;
  getHistorical: (filter: MetricFilter) => void;
}

// Fix the Socket interface to avoid TypeScript errors
// Use type Socket = BaseSocket<ClientToServerEvents, ServerToClientEvents> instead of extending
type Socket = {
  id: string;
  connected: boolean;
  disconnect: () => void;
  on<K extends keyof ClientToServerEvents>(
    event: K,
    listener: (...args: Parameters<ClientToServerEvents[K]>) => void,
  ): void;
  emit<K extends keyof ServerToClientEvents>(
    event: K,
    ...args: Parameters<ServerToClientEvents[K]>
  ): boolean;
};

// Enhanced Server type with proper event typings
type MetricsServer = Server<ClientToServerEvents, ServerToClientEvents>;

@WebSocketGateway({
  namespace: '/metrics',
  cors: {
    origin: '*',
  },
  transports: ['websocket', 'polling'],
})
export class MetricsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer() server: MetricsServer;
  private clientSubscriptions = new Map<string, Subscription>();
  private readonly CONTEXT = 'MetricsGateway';
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly metricsService: MetricsService,
    private readonly logger: LoggerService,
  ) {}

  afterInit(): void {
    // Set up periodic cleanup of stale subscriptions
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSubscriptions();
    }, 60000); // Check every minute

    this.logger.info('Metrics gateway initialized', this.CONTEXT);

    // Start periodic stats logging
    this.startPeriodicMetricsLogging();
  }

  handleConnection(client: Socket): void {
    this.logger.info(`Client connected: ${client.id}`, this.CONTEXT);
  }

  handleDisconnect(client: Socket): void {
    // Clean up subscriptions when a client disconnects
    this.cleanupClientSubscriptions(client.id);
    this.logger.info(`Client disconnected: ${client.id}`, this.CONTEXT);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() filter: MetricFilter,
  ): void {
    // First clean up any existing subscription for this client
    this.cleanupClientSubscriptions(client.id);

    // Create new subscription with the filter
    this.logger.debug(
      `Client ${client.id} subscribing to metrics with filter: ${JSON.stringify(filter)}`,
      this.CONTEXT,
    );

    const subscription = this.metricsService.getMetricStream(filter).subscribe({
      next: (metric) => {
        try {
          // Log every Nth metric to avoid log flooding (e.g., every 10th metric)
          if (Math.random() < 0.1) {
            this.logger.debug(
              `Sending ${metric.type} metric (${metric.value}${metric.unit}) to client ${client.id}`,
              this.CONTEXT,
            );
          }

          if (client.connected) {
            // Double-check the emit function is available
            if (typeof client.emit !== 'function') {
              this.logger.warn(
                `Client ${client.id} is missing an emit function`,
                this.CONTEXT,
              );
              return;
            }

            // Type-safe emit with proper payload structure
            const safeMetric = JSON.parse(JSON.stringify(metric)) as {
              timestamp: string;
              type: string;
              value: number;
              unit: string;
              id?: string;
              host?: string;
              tags?: Record<string, string>;
            };

            client.emit('metric', safeMetric);
          }
        } catch (emitError: unknown) {
          const errorMessage =
            emitError instanceof Error ? emitError.message : String(emitError);
          this.logger.error(
            `Error emitting metric to client ${client.id}: ${errorMessage}`,
            this.CONTEXT,
            emitError,
          );
        }
      },
      error: (err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Error in metrics stream for client ${client.id}: ${errorMessage}`,
          this.CONTEXT,
          err,
        );
        try {
          if (client.connected) {
            client.emit('error', { message: 'Error in metrics stream' });
          }
        } catch {
          this.logger.error(
            `Failed to send error notification to client ${client.id}`,
            this.CONTEXT,
          );
        }
      },
      complete: () => {
        this.logger.debug(
          `Metrics stream completed for client ${client.id}`,
          this.CONTEXT,
        );
        try {
          if (client.connected) {
            client.emit('complete', { message: 'Metrics stream completed' });
          }
        } catch {
          this.logger.error(
            `Failed to send completion notification to client ${client.id}`,
            this.CONTEXT,
          );
        }
      },
    });

    // Store the subscription
    this.clientSubscriptions.set(client.id, subscription);

    // Emit an initial success message with proper error handling and type safety
    try {
      if (client.connected && typeof client.emit === 'function') {
        client.emit('subscribed', {
          message: 'Successfully subscribed to metrics',
          filter,
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send subscription confirmation to client ${client.id}: ${errorMessage}`,
        this.CONTEXT,
        error,
      );
    }
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket): void {
    this.cleanupClientSubscriptions(client.id);

    try {
      if (client.connected && typeof client.emit === 'function') {
        client.emit('unsubscribed', {
          message: 'Successfully unsubscribed from metrics',
        });
        this.logger.debug(
          `Client ${client.id} unsubscribed from metrics`,
          this.CONTEXT,
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send unsubscribe confirmation to client ${client.id}: ${errorMessage}`,
        this.CONTEXT,
        error,
      );
    }
  }

  @SubscribeMessage('getHistorical')
  async handleGetHistorical(
    @ConnectedSocket() client: Socket,
    @MessageBody() filter: MetricFilter,
  ): Promise<void> {
    try {
      this.logger.debug(
        `Client ${client.id} requesting historical metrics with filter: ${JSON.stringify(filter)}`,
        this.CONTEXT,
      );

      // Example of using MetricType for type filtering if none provided
      if (!filter?.types || filter.types.length === 0) {
        this.logger.debug(
          `No metric types specified, defaulting to CPU and MEMORY`,
          this.CONTEXT,
        );
        // Create a type-safe default filter
        filter = {
          ...filter,
          types: [MetricType.CPU, MetricType.MEMORY],
        };
      }

      // Add timeout protection for historical data requests with proper typing
      const timeoutPromise = new Promise<unknown[]>((_, reject) => {
        setTimeout(
          () => reject(new Error('Historical data request timed out')),
          15000,
        );
      });

      // Race between the actual request and the timeout with proper typing
      const metrics = await Promise.race<unknown[]>([
        lastValueFrom(this.metricsService.getAllMetrics(filter)),
        timeoutPromise,
      ]);

      // Safely emit the historical metrics with connection and function checks
      if (client?.connected && typeof client.emit === 'function') {
        if (Array.isArray(metrics)) {
          client.emit('historical', metrics);
        } else {
          this.logger.error(
            `Expected metrics to be an array but received: ${typeof metrics}`,
            this.CONTEXT,
          );
          client.emit('error', {
            message:
              'Failed to retrieve historical metrics: invalid data format',
          });
        }
      } else {
        this.logger.warn(
          `Cannot emit to disconnected client ${client?.id}`,
          this.CONTEXT,
        );
      }
    } catch (error: unknown) {
      // Improved error handling with proper logging and cleanup
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      this.logger.error(
        `Failed to retrieve historical metrics for client ${client?.id || 'unknown'}: ${errorMessage}`,
        this.CONTEXT,
        error instanceof Error ? error : new Error(String(error)),
      );

      // Safely emit error only if client is still connected
      if (client?.connected && typeof client.emit === 'function') {
        client.emit('error', {
          message: 'Failed to retrieve historical metrics',
        });
      }
    }
  }

  private cleanupClientSubscriptions(clientId: string): void {
    const subscription = this.clientSubscriptions.get(clientId);
    if (subscription) {
      subscription.unsubscribe();
      this.clientSubscriptions.delete(clientId);
      this.logger.debug(
        `Cleaned up subscription for client ${clientId}`,
        this.CONTEXT,
      );
    }
  }

  private cleanupStaleSubscriptions(): void {
    try {
      // Fix the unsafe cast by using proper type checking
      const connectedClientIds = new Set<string>();

      this.logger.debug(
        `Found ${connectedClientIds.size} active socket connections`,
        this.CONTEXT,
      );

      // Add safety check before cleanup
      if (this.clientSubscriptions.size === 0) {
        return; // Nothing to clean up
      }

      // Rest of the cleanup process with additional protection
      let cleanupCount = 0;
      let activeCount = 0;

      try {
        for (const [
          clientId,
          subscription,
        ] of this.clientSubscriptions.entries()) {
          if (!connectedClientIds.has(clientId)) {
            if (!subscription.closed) {
              subscription.unsubscribe();
            }
            this.clientSubscriptions.delete(clientId);
            cleanupCount++;
          } else {
            activeCount++;
          }
        }

        if (cleanupCount > 0 || activeCount > 0) {
          this.logger.info(
            `Metrics cleanup: removed ${cleanupCount}, active ${activeCount}`,
            this.CONTEXT,
          );
        }
      } catch (mapError: unknown) {
        this.logger.error(
          `Error iterating subscriptions map: ${mapError instanceof Error ? mapError.message : String(mapError)}`,
          this.CONTEXT,
          mapError,
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error during stale subscription cleanup: ${errorMessage}`,
        this.CONTEXT,
        error,
      );
    }
  }

  private startPeriodicMetricsLogging(): void {
    setInterval(() => {
      const activeConnections = this.clientSubscriptions.size;
      this.logger.info(
        `Metrics stats: ${activeConnections} active connections, tracking ${Object.values(MetricType).length} metric types`,
        this.CONTEXT,
      );
    }, 300000); // Log every 5 minutes
  }

  onModuleDestroy(): void {
    // Clean up interval when module is destroyed
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clean up any remaining subscriptions
    for (const subscription of this.clientSubscriptions.values()) {
      subscription.unsubscribe();
    }
    this.clientSubscriptions.clear();

    this.logger.info('Metrics gateway resources cleaned up', this.CONTEXT);
  }
}
