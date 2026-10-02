import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { abilitiesForRole } from './permissions';
import { AuthUser } from '../common/decorators/current-user.decorator';

const TOKEN_TTL_SECONDS = 2 * 60 * 60;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

export interface LoginResult {
  token: string;
  token_type: 'Bearer';
  expires_at: string;
  abilities: string[];
}

@Injectable()
export class AuthService {
  /** Intentos de login por `email|ip` dentro de la ventana. */
  private readonly attempts = new Map<string, number[]>();
  /** Tokens revocados por logout, con su expiración en ms. */
  private readonly revoked = new Map<string, number>();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    email: string,
    password: string,
    ip: string,
  ): Promise<LoginResult> {
    this.checkRateLimit(`${email}|${ip}`);

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      throw new UnauthorizedException(
        'Las credenciales proporcionadas son incorrectas.',
      );
    }

    const abilities = abilitiesForRole(user.role);
    const jti = randomUUID();
    const token = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        abilities,
        jti,
      },
      { expiresIn: TOKEN_TTL_SECONDS },
    );

    return {
      token,
      token_type: 'Bearer',
      expires_at: new Date(
        Date.now() + TOKEN_TTL_SECONDS * 1000,
      ).toISOString(),
      abilities,
    };
  }

  logout(user: AuthUser): { message: string } {
    if (user?.jti) {
      const expiresAt = user.exp ? user.exp * 1000 : Date.now();
      this.revoked.set(user.jti, expiresAt);
    }
    return { message: 'Sesión cerrada correctamente.' };
  }

  isRevoked(jti: string): boolean {
    const expiresAt = this.revoked.get(jti);
    if (expiresAt === undefined) {
      return false;
    }
    if (expiresAt < Date.now()) {
      this.revoked.delete(jti);
      return false;
    }
    return true;
  }

  private checkRateLimit(key: string): void {
    const now = Date.now();
    const history = (this.attempts.get(key) ?? []).filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
    );

    if (history.length >= RATE_LIMIT_MAX_ATTEMPTS) {
      const retryAfter = Math.max(
        1,
        Math.ceil((RATE_LIMIT_WINDOW_MS - (now - history[0])) / 1000),
      );
      throw new HttpException(
        {
          message:
            'Demasiados intentos de inicio de sesión. Intente nuevamente más tarde.',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    history.push(now);
    this.attempts.set(key, history);
  }
}
