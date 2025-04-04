import { Resolver, Query } from '@nestjs/graphql';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Observable, of } from 'rxjs';

/**
 * Helper function to safely extract error messages
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * This resolver provides utilities to validate the GraphQL schema
 * and help diagnose issues with schema generation
 */
@Resolver()
export class SchemaResolver {
  @Query(() => String, { description: 'Get the current GraphQL schema' })
  getSchema(): Observable<string> {
    try {
      const schemaPath = join(process.cwd(), 'src/schema.gql');
      const schema = readFileSync(schemaPath, 'utf8');
      return of(schema);
    } catch (error: unknown) {
      return of(`Error loading schema: ${getErrorMessage(error)}`);
    }
  }

  @Query(() => [String], {
    description: 'List all defined types in the schema',
  })
  listTypes(): Observable<string[]> {
    try {
      const schemaPath = join(process.cwd(), 'src/schema.gql');
      const schema = readFileSync(schemaPath, 'utf8');

      // Extracting type definitions
      const typeRegex = /type\s+(\w+)/g;
      const matches = [...schema.matchAll(typeRegex)];
      return of(matches.map((m) => m[1]));
    } catch (error: unknown) {
      return of([`Error: ${getErrorMessage(error)}`]);
    }
  }
}
