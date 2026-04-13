import type { IUserRepository } from '@/domain/repositories/interfaces';
import { AppError } from '@/shared/errors/app-error';
import { User } from '@/domain/entities/models';

export class UpdateProfileUseCase {
    constructor(private readonly userRepository: IUserRepository) {}

    async execute(userId: string, data: { name?: string; email?: string }): Promise<Omit<User, 'password'>> {
        const user = await this.userRepository.findById(userId);
        if (!user) throw new AppError('User not found', 404);

        if (data.email && data.email !== user.email) {
            const existing = await this.userRepository.findByEmail(data.email);
            if (existing) {
                throw new AppError('Email is already in use by another account', 409);
            }
        }

        const updatedUser = await this.userRepository.update(userId, data);
        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword as Omit<User, 'password'>;
    }
}
