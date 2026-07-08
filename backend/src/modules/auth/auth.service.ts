import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    private configService: ConfigService,
  ) {}

  async validateTelegramLogin(initData: string): Promise<any> {
    // Parse initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    
    // Sort params alphabetically
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    const botToken = this.configService.get('TELEGRAM_BOT_TOKEN');
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(sortedParams)
      .digest('hex');
    
    if (computedHash !== hash) {
      throw new UnauthorizedException('Invalid Telegram data');
    }

    // Extract user data
    const userData = JSON.parse(params.get('user') || '{}');
    if (!userData.id) {
      throw new UnauthorizedException('No user data');
    }

    // Find or create user
    let user = await this.userService.findByTelegramId(userData.id.toString());
    if (!user) {
      user = await this.userService.create({
        telegramId: userData.id.toString(),
        username: userData.username || 'user_' + userData.id,
        firstName: userData.first_name,
        lastName: userData.last_name,
        photoUrl: userData.photo_url,
      });
    }

    return user;
  }

  async login(user: any) {
    const payload = { sub: user.id, telegramId: user.telegramId };
    return { access_token: this.jwtService.sign(payload) };
  }
}