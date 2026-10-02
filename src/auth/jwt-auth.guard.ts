import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

interface AuthenticatedRequest {
  headers: Record<string, string | undefined>;
  user?: AuthUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();
    const header = request.headers['authorization'];
    const unauthorized = new UnauthorizedException('No autenticado.');

    if (!header || !header.startsWith('Bearer ')) {
      throw unauthorized;
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw unauthorized;
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthUser>(token);
      if (payload.jti && this.authService.isRevoked(payload.jti)) {
        throw unauthorized;
      }
      request.user = payload;
      return true;
    } catch {
      throw unauthorized;
    }
  }
}
