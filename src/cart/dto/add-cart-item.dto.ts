import { IsInt, Max, Min } from 'class-validator';

export class AddCartItemDto {
  @IsInt()
  productId: number;

  @IsInt()
  @Min(1)
  @Max(999)
  quantity: number;
}
