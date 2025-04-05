# Metrics System Documentation

The Craft AI Metrics System provides real-time monitoring and visualization of system performance metrics.

## Overview

The metrics system collects, stores, and displays various performance indicators including:

- CPU usage
- Memory utilization
- Request/response rates
- Error rates
- Queue sizes
- Active user counts
- Disk I/O statistics

## Architecture

The metrics system uses a multi-layered architecture:

1. **Collection Layer**: Gathers raw metrics data from system resources
2. **Processing Layer**: Calculates derived metrics and aggregates
3. **Storage Layer**: Stores historical metrics for trend analysis
4. **Visualization Layer**: Presents metrics in a human-readable format

## Metrics Viewer

The Metrics Viewer provides a real-time dashboard for monitoring system performance.

### Features

- Real-time updates using WebSocket connections
- Historical data viewing with customizable time ranges
- Threshold alerts for critical metrics
- Exportable reports in CSV/JSON format
- Integration with the logging system for contextual troubleshooting

### Accessing the Metrics Viewer

The Metrics Viewer is available at: http://localhost:3000/metrics/viewer.html

### Available Metrics Types

| Metric Type    | Description                                | Unit      |
|---------------|--------------------------------------------|-----------|
| cpu           | CPU utilization                            | %         |
| memory        | Memory utilization                         | %, MB     |
| request_rate  | Incoming requests per second               | req/s     |
| response_time | Average response time                      | ms        |
| error_rate    | Rate of errors                             | %         |
| queue_size    | Size of processing queues                  | count     |
| active_users  | Number of currently active users           | count     |
| disk_io       | Disk read/write operations                 | ops/s, MB/s |

## Implementation Status

The Metrics System is currently in development with the following components:

- ✅ Core metrics collection service
- ✅ Basic visualization framework
- 🔄 Real-time metrics streaming (in progress)
- 🔄 Historical data storage (in progress)
- 📝 Advanced visualization features (planned)
- 📝 Alerting system (planned)

## Usage in Code

### Collecting Custom Metrics

```typescript
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class YourService {
  constructor(private readonly metricsService: MetricsService) {}
  
  async performOperation() {
    // Start timer
    const startTime = performance.now();
    
    // Your operation here
    const result = await this.doSomething();
    
    // Record duration
    const duration = performance.now() - startTime;
    this.metricsService.recordMetric('custom_operation', duration, 'ms');
    
    return result;
  }
}
```

### Setting Up Thresholds

```typescript
// In your module initialization
metricsService.setThreshold('cpu', {
  warning: 70, // 70% CPU usage triggers warning
  critical: 90 // 90% CPU usage triggers critical alert
});
```

## Integration with Logging

The Metrics System integrates with the logging system to provide context when thresholds are exceeded:

```typescript
// Automatic log entry when a threshold is exceeded
// [WARN] [MetricsService] CPU usage threshold exceeded: 75% (warning: 70%)
```

## Future Development

1. Machine learning-based anomaly detection
2. Predictive scaling recommendations 
3. Custom dashboard creation
4. Mobile notifications for critical alerts
