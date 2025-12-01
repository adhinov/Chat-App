import prisma from '../config/prisma';

export class AdminService {
  static async getAllUsers() {
    const users = await prisma.user.findMany({
      orderBy: {
        id: 'asc'
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });
    return users;
  }
}