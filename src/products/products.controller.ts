import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermissions('view products')
  @ApiOperation({ summary: 'Listado paginado de productos' })
  list(
    @Query() query: Record<string, unknown>,
    @CurrentUser() user: AuthUser,
    @Req() request: Request,
  ): Promise<Record<string, unknown>> {
    return this.productsService.listPaginated(
      query,
      user,
      request.originalUrl,
    );
  }

  @Get(':id')
  @RequirePermissions('view products')
  @ApiOperation({ summary: 'Detalle de un producto' })
  async show(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: unknown }> {
    return { data: await this.productsService.getById(id, user) };
  }

  @Post()
  @RequirePermissions('create products')
  @ApiOperation({ summary: 'Crear producto (201 + Location)' })
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ data: unknown }> {
    const data = await this.productsService.create(dto, user);
    response.setHeader('Location', `/api/products/${data.id}`);
    return { data };
  }

  @Put(':id')
  @RequirePermissions('update products')
  @ApiOperation({ summary: 'Actualizar producto' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: unknown }> {
    return { data: await this.productsService.update(id, dto, user) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('delete products')
  @ApiOperation({ summary: 'Eliminar producto (soft delete)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.productsService.remove(id, user);
  }
}
