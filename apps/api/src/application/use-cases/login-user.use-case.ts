import type { IUserRepository } from '@/domain/repositories/interfaces';
import { AppError } from '@/shared/errors/app-error';
import type { User } from '@/domain/entities/models';

export class LoginUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(email: string, passwordPlain: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || (!user.password)) {
      throw new AppError('Invalid email or password', 401);
    }
    
    const isValid = await Bun.password.verify(passwordPlain, user.password);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401);
    }
    return user;
  }
}
