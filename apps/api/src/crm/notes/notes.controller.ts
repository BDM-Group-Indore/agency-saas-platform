import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a text note' })
  @ApiResponse({ status: 201, description: 'Note successfully created' })
  create(@Body() dto: CreateNoteDto, @TenantId() tenantId: string) {
    return this.notesService.create(dto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List notes with pagination and search' })
  findAll(@Query() query: PaginationQueryDto, @TenantId() tenantId: string) {
    return this.notesService.findAll(query, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single note' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.notesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a note content' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
    @TenantId() tenantId: string
  ) {
    return this.notesService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a note record' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.notesService.remove(id, tenantId);
  }
}
