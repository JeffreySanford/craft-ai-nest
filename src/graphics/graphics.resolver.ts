import { Resolver, Query, Args, ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class GraphicUrl {
  @Field()
  url: string;
}

@Resolver()
export class GraphicsResolver {
  @Query(() => GraphicUrl)
  getGraphicUrl(@Args('id') id: string): GraphicUrl {
    return { url: `http://localhost:3000/graphics/${id}` };
  }
}
