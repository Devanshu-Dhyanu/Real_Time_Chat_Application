import {
  Controller,
  Delete,
  Body,
  Get,
  Param,
  Post,
  Patch,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import {
  AddContactDto,
  UpdateContactDto,
  UpdateProfilePhotoDto,
  UpdatePublicKeyDto,
  RegisterDto,
  LoginDto,
} from '../dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  async register(@Body(ValidationPipe) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body(ValidationPipe) dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('profile/:userId')
  async getProfile(@Param('userId') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Get('list')
  async getAllUsers(
    @Query('isOnline') isOnline: string,
    @Query('currentUserId') currentUserId: string,
  ) {
    return this.authService.getAllUsers(isOnline, currentUserId);
  }

  @Get('contacts/:userId')
  async getContacts(@Param('userId') userId: string) {
    return this.authService.getContacts(userId);
  }

  @Post('contacts/:userId')
  async addContact(
    @Param('userId') userId: string,
    @Body(ValidationPipe) dto: AddContactDto,
  ) {
    return this.authService.addContact(userId, dto);
  }

  @Patch('contacts/:userId/:contactEmail')
  async updateContact(
    @Param('userId') userId: string,
    @Param('contactEmail') contactEmail: string,
    @Body(ValidationPipe) dto: UpdateContactDto,
  ) {
    return this.authService.updateContact(userId, contactEmail, dto);
  }

  @Delete('contacts/:userId/:contactEmail')
  async removeContact(
    @Param('userId') userId: string,
    @Param('contactEmail') contactEmail: string,
  ) {
    return this.authService.removeContact(userId, contactEmail);
  }

  @Patch('profile-photo/:userId')
  async updateProfilePhoto(
    @Param('userId') userId: string,
    @Body(ValidationPipe) dto: UpdateProfilePhotoDto,
  ) {
    return this.authService.updateProfilePhoto(userId, dto.avatarUrl);
  }

  @Patch('public-key/:userId')
  async updatePublicKey(
    @Param('userId') userId: string,
    @Body(ValidationPipe) dto: UpdatePublicKeyDto,
  ) {
    return this.authService.updatePublicKey(userId, dto.publicKey);
  }
}
