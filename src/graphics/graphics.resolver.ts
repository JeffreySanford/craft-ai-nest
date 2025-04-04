import { Resolver, Query, Args } from '@nestjs/graphql';

@Resolver()
export class GraphicsResolver {
  @Query(() => String)
  getGraphicUrl(@Args('id') id: string): string {
    return `http://localhost:3000/graphics/${id}`;
  }
}
