import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@ApiBearerAuth('access-token')
@Controller('admin/uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Roles('super_admin', 'branch_admin')
  @Post('image')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a single image to Cloudinary' })
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    return this.uploadsService.uploadImage(file.buffer, file.originalname);
  }

  @Roles('super_admin')
  @Post('images')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple images to Cloudinary' })
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('No files provided');
    return Promise.all(
      files.map((f) => this.uploadsService.uploadImage(f.buffer, f.originalname)),
    );
  }

  @Roles('super_admin')
  @Post('signed-url')
  @ApiOperation({ summary: 'Generate a Cloudinary signed upload URL' })
  getSignedUrl() {
    return this.uploadsService.getSignedUploadUrl();
  }
}
