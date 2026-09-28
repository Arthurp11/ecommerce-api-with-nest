import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CreateAddressUseCase } from './usecases/create-address.usecase';
import { UpdateAddressUseCase } from './usecases/update-address.usecase';
import { DeleteAddressUseCase } from './usecases/delete-address.usecase';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';

@ApiTags('addresses')
@ApiBearerAuth()
@Controller('addresses')
export class AddressController {
  constructor(
    private readonly addressService: AddressService,
    private readonly createAddressUseCase: CreateAddressUseCase,
    private readonly updateAddressUseCase: UpdateAddressUseCase,
    private readonly deleteAddressUseCase: DeleteAddressUseCase,
  ) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUserDto) {
    return this.addressService.findAllByUser(user.userId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUserDto) {
    const address = await this.addressService.findOneForUser(id, user.userId);

    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    return address;
  }

  @Post()
  create(@Body() createAddressDto: CreateAddressDto, @CurrentUser() user: AuthenticatedUserDto) {
    return this.createAddressUseCase.execute(user.userId, createAddressDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAddressDto: UpdateAddressDto,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    return this.updateAddressUseCase.execute(id, user.userId, updateAddressDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUserDto) {
    return this.deleteAddressUseCase.execute(id, user.userId);
  }
}
