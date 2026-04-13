import type { IUserRepository } from '@/domain/repositories/interfaces';
import { AppError } from '@/shared/errors/app-error';

export class ChangePasswordUseCase {
    constructor(private readonly userRepository: IUserRepository) {}

    async execute(userId: string, currentPasswordPlain: string, newPasswordPlain: string): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user || !user.password) throw new AppError('User not found', 404);

        const isMatch = await Bun.password.verify(currentPasswordPlain, user.password);
        if (!isMatch) {
            throw new AppError('Current password is incorrect', 400);
        }

        const hashedNewPassword = await Bun.password.hash(newPasswordPlain);
        await this.userRepository.update(userId, { password: hashedNewPassword });
    }
}
