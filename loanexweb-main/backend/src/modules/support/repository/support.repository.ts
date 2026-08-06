import type { SupportIssueType } from '../../../types/database.types';
import { prisma } from '../../../config/database';

function generateTicketNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let random = '';
  for (let i = 0; i < 4; i += 1) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return `LX-SUP-${Date.now().toString(36).toUpperCase()}${random}`;
}

export class SupportRepository {
  listForUser(userId: string) {
    return prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByIdForUser(ticketId: string, userId: string) {
    return prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
    });
  }

  create(input: {
    userId: string;
    issueType: SupportIssueType;
    subject: string;
    description: string;
    attachment?: string;
  }) {
    return prisma.supportTicket.create({
      data: {
        userId: input.userId,
        ticketNumber: generateTicketNumber(),
        issueType: input.issueType,
        subject: input.subject,
        description: input.description,
        attachment: input.attachment ?? null,
      },
    });
  }
}

export const supportRepository = new SupportRepository();
