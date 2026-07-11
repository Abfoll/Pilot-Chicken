import { Controller, Post, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UserService } from '../user/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateTelegramLogin(loginDto.initData);
    return this.authService.login(user);
  }

  @Post('test-login')
  @HttpCode(HttpStatus.OK)
  async testLogin() {
    let user = await this.userService.findByTelegramId('123456');
    if (!user) {
      user = await this.userService.create({
        telegramId: '123456',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        photoUrl: 'https://via.placeholder.com/100',
      });
    }
    return this.authService.login(user);
  }
}