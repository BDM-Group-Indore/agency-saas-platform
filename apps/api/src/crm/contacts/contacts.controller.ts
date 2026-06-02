import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiResponse({ status: 201, description: 'Contact successfully created' })
  create(@Body() dto: CreateContactDto, @TenantId() tenantId: string) {
    return this.contactsService.create(dto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List contacts with pagination and search' })
  findAll(@Query() query: PaginationQueryDto, @TenantId() tenantId: string) {
    return this.contactsService.findAll(query, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single contact by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.contactsService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update contact details' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
    @TenantId() tenantId: string
  ) {
    return this.contactsService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a contact' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.contactsService.remove(id, tenantId);
  }
}
