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
    if (!botToken) {
      throw new UnauthorizedException('TELEGRAM_BOT_TOKEN is not configured');
    }

    // Telegram Mini App (WebAppData) standard HMAC validation:
    const webAppSecret = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    const computedHashWebApp = crypto
      .createHmac('sha256', webAppSecret)
      .update(sortedParams)
      .digest('hex');

    // Telegram Login Widget format (backward compatibility fallback):
    const widgetSecret = crypto.createHash('sha256').update(botToken).digest();
    const computedHashWidget = crypto
      .createHmac('sha256', widgetSecret)
      .update(sortedParams)
      .digest('hex');

    if (computedHashWebApp !== hash && computedHashWidget !== hash) {
      throw new UnauthorizedException('Invalid Telegram data');
    }

    // Check auth_date freshness (replay protection within 24 hours)
    const authDate = Number(params.get('auth_date'));
    if (authDate) {
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (nowSeconds - authDate > 86400) {
        throw new UnauthorizedException('Telegram auth data expired');
      }
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