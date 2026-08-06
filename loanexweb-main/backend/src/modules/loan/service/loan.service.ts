import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import {
  EmiApplicationStatus,
  type EmiApplication,
} from '@prisma/client';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { prisma } from '../../../config/database';
import { auditLogService } from '../../verification/service/audit-log.service';
import { autopayService } from '../../autopay/service/autopay.service';
import {
  LoanStatus,
  loanRepository,
  type LoanWithRelations,
} from '../repository/loan.repository';
import { addMonths, buildEmiSchedule } from './emi-calculator.service';
import {
  buildDashboardPayload,
  buildLoanSummary,
  buildPaymentHistoryPayload,
  productImagePath,
} from './loan-payload.service';

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function todayPrefix(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `LX-LN-${y}${m}${d}-`;
}

export class LoanService {
  async activateFromApplication(applicationId: string, userId?: string) {
    const existing = await loanRepository.findByApplicationId(applicationId);
    if (existing) return existing;

    const application = await prisma.emi_applications.findUnique({
      where: { id: applicationId },
    });
    if (!application) {
      throw new NotFoundError('EMI application not found.');
    }
    if (userId && application.userId !== userId) {
      throw new ForbiddenError('You do not have access to this application.');
    }
    if (application.status !== EmiApplicationStatus.ACTIVE_EMI) {
      throw new BadRequestError('Loan can only be created when application status is ACTIVE_EMI.', {
        status: application.status,
      });
    }

    return this.createLoanAccount(application);
  }

  /** Creates loan account after down payment so My EMI + AutoPay work before delivery. */
  async ensureLoanAfterDownPayment(applicationId: string) {
    const existing = await loanRepository.findByApplicationId(applicationId);
    if (existing) return existing;

    let application = await prisma.emi_applications.findUnique({
      where: { id: applicationId },
    });
    if (!application) {
      throw new NotFoundError('EMI application not found.');
    }

    if (application.status === EmiApplicationStatus.DOWN_PAYMENT_COMPLETED) {
      application = await prisma.emi_applications.update({
        where: { id: applicationId },
        data: { status: EmiApplicationStatus.ACTIVE_EMI },
      });
    }

    if (application.status !== EmiApplicationStatus.ACTIVE_EMI) {
      throw new BadRequestError(
        'Loan can only be created after down payment is completed.',
        { status: application.status },
      );
    }

    return this.createLoanAccount(application);
  }

  async ensureActiveLoanForUser(userId: string): Promise<LoanWithRelations> {
    const existing = await loanRepository.findByUserId(userId);
    if (existing) {
      await loanRepository.markOverdue(existing.id);
      const refreshed = await loanRepository.findById(existing.id);
      return refreshed as LoanWithRelations;
    }

    const application = await prisma.emi_applications.findFirst({
      where: { userId, status: EmiApplicationStatus.ACTIVE_EMI },
      orderBy: { updatedAt: 'desc' },
    });
    if (!application) {
      throw new NotFoundError('No active loan found for this account.');
    }

    const created = await this.createLoanAccount(application);
    await auditLogService.log({
      userId,
      action: 'LOAN_ACTIVATED',
      entity: 'loan_accounts',
      metadata: {
        loanAccountNumber: created.loanAccountNumber,
        applicationNumber: application.id,
        timestamp: new Date().toISOString(),
      },
    });
    return created;
  }

  private async createLoanAccount(application: EmiApplication) {
    const loanAmount =
      toNumber(application.loanAmount) || toNumber(application.loanAmount);
    const tenure = application12 || application12 || 1;
    const interestRate = toNumber(application.monthlyEmi) || 12.5;
    const processingFee = toNumber(application.monthlyEmi) || 0;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const plannedEmi = toNumber(application.monthlyEmi) || toNumber(application.monthlyEmi);
    const schedulePlan = buildEmiSchedule({
      principal: loanAmount,
      annualRatePercent: interestRate,
      tenureMonths: tenure,
      startDate,
      emiAmount: plannedEmi > 0 ? plannedEmi : undefined,
    });

    const prefix = todayPrefix();
    const count = await loanRepository.countLoansToday(prefix);
    const loanAccountNumber = `${prefix}${String(count + 1).padStart(4, '0')}`;
    const loanEndDate = addMonths(startDate, tenure);

    const created = await loanRepository.createWithSchedule({
      loanAccountNumber,
      applicationId: application.id,
      userId: application.userId,
      productId: application.productId,
      loanAmount,
      interestRate,
      processingFee,
      loanTenure: tenure,
      emiAmount: schedulePlan.emiAmount,
      totalInterest: schedulePlan.totalInterest,
      totalPayable: schedulePlan.totalPayable,
      outstandingAmount: schedulePlan.totalPayable,
      loanStartDate: startDate,
      loanEndDate,
      schedule: schedulePlan.rows,
      nextEmiDueDate: schedulePlan.rows[0]?.dueDate ?? null,
    });

    await auditLogService.log({
      userId: application.userId,
      action: 'LOAN_CREATED',
      entity: 'loan_accounts',
      metadata: {
        loanAccountNumber: created.loanAccountNumber,
        applicationNumber: application.id,
        loanAmount,
        tenure,
        emiAmount: schedulePlan.emiAmount,
        timestamp: new Date().toISOString(),
      },
    });

    return created;
  }

  async getCurrent(userId: string) {
    const loan = await this.requireDashboardLoan(userId);
    return buildLoanSummary(loan);
  }

  async getDashboard(userId: string) {
    const loan = await this.requireDashboardLoan(userId);

    await auditLogService.log({
      userId,
      action: 'EMI_DASHBOARD_VIEWED',
      entity: 'loan_accounts',
      metadata: {
        loanAccountNumber: loan.loanAccountNumber,
        loanStatus: loan.loanStatus,
        timestamp: new Date().toISOString(),
      },
    });

    return buildDashboardPayload(loan);
  }

  async getPaymentHistory(userId: string) {
    const loan = await this.requireDashboardLoan(userId);
    return buildPaymentHistoryPayload(loan);
  }

  async getStatement(userId: string) {
    const loan = await this.requireDashboardLoan(userId);
    const absolutePath = await this.generatePdf(loan, 'statement');
    return {
      absolutePath,
      fileName: `${loan.loanAccountNumber}-statement.pdf`,
    };
  }

  async getAgreement(userId: string) {
    const loan = await this.requireDashboardLoan(userId);
    const absolutePath = await this.generatePdf(loan, 'agreement');
    return {
      absolutePath,
      fileName: `${loan.loanAccountNumber}-agreement.pdf`,
    };
  }

  async listForAdmin(status?: string) {
    const loanStatus =
      status && Object.values(LoanStatus).includes(status as LoanStatus)
        ? (status as LoanStatus)
        : undefined;
    const loans = await loanRepository.listForAdmin(loanStatus);
    return {
      total: loans.length,
      items: loans.map((loan) => ({
        ...buildLoanSummary(loan),
        customer: loan.user
          ? {
              id: loan.user.id,
              fullName: loan.user.fullName,
              mobile: loan.user.mobile,
              email: loan.user.email,
            }
          : null,
      })),
    };
  }

  async getForAdmin(loanId: string) {
    const loan = await loanRepository.findById(loanId);
    if (!loan) throw new NotFoundError('Loan not found.');
    return buildDashboardPayload(loan);
  }

  async adminUpdate(
    loanId: string,
    input: { loanStatus: LoanStatus; remarks?: string; updatedBy?: string },
  ) {
    const loan = await loanRepository.findById(loanId);
    if (!loan) throw new NotFoundError('Loan not found.');

    if (!Object.values(LoanStatus).includes(input.loanStatus)) {
      throw new BadRequestError('Invalid loan status.', { loanStatus: input.loanStatus });
    }

    if (loan.loanStatus === LoanStatus.CLOSED && input.loanStatus !== LoanStatus.CLOSED) {
      throw new BadRequestError('Closed loans cannot be reopened.');
    }

    const updated = await loanRepository.updateStatus(loanId, input.loanStatus);

    await auditLogService.log({
      userId: loan.userId,
      action: 'LOAN_STATUS_UPDATED',
      entity: 'loan_accounts',
      metadata: {
        loanAccountNumber: loan.loanAccountNumber,
        from: loan.loanStatus,
        to: input.loanStatus,
        remarks: input.remarks ?? null,
        updatedBy: input.updatedBy ?? 'admin',
        timestamp: new Date().toISOString(),
      },
    });

    if (input.loanStatus === LoanStatus.CLOSED) {
      await autopayService.disableForClosedLoan(loanId, loan.userId);
    }

    return buildDashboardPayload(updated);
  }

  private async requireDashboardLoan(userId: string): Promise<LoanWithRelations> {
    const loan = await this.ensureActiveLoanForUser(userId);

    if (loan.loanStatus !== LoanStatus.ACTIVE) {
      throw new ForbiddenError(
        `EMI dashboard is available only for ACTIVE loans. Current status: ${loan.loanStatus}.`,
        { loanStatus: loan.loanStatus },
      );
    }

    return loan;
  }

  private async generatePdf(
    loan: LoanWithRelations,
    type: 'statement' | 'agreement',
  ): Promise<string> {
    const dir = path.resolve(process.cwd(), 'storage', 'loans');
    fs.mkdirSync(dir, { recursive: true });
    const fileName = `${loan.loanAccountNumber}-${type}.pdf`;
    const absolutePath = path.join(dir, fileName);
    const summary = buildLoanSummary(loan);
    const dashboard = buildDashboardPayload(loan);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(absolutePath);
      doc.pipe(stream);

      doc.fontSize(20).fillColor('#0A2E6F').text(
        type === 'statement' ? 'LoanEx Loan Statement' : 'LoanEx Loan Agreement',
      );
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#111827');
      doc.text(`Loan Account: ${summary.loanAccountNumber}`);
      doc.text(`Application: ${summary.id}`);
      doc.text(`Product: ${summary.productName ?? summary.productId}`);
      doc.text(`Loan Amount: INR ${summary.loanAmount.toFixed(2)}`);
      doc.text(`Interest Rate: ${summary.monthlyEmi}%`);
      doc.text(`Tenure: ${summary.loanTenure} months`);
      doc.text(`EMI Amount: INR ${summary.emiAmount.toFixed(2)}`);
      doc.text(`Total Payable: INR ${summary.totalPayable.toFixed(2)}`);
      doc.text(`Outstanding: INR ${dashboard.summary.outstandingBalance.toFixed(2)}`);
      doc.text(`Status: ${summary.loanStatus}`);

      if (type === 'statement') {
        doc.moveDown();
        doc.text('Recent payments:');
        for (const payment of dashboard.recentPayments) {
          doc.text(
            `EMI #${payment.emiNumber} | ${payment.amount.toFixed(2)} | ${payment.status}`,
          );
        }
      } else {
        doc.moveDown();
        doc
          .fontSize(10)
          .fillColor('#4B5563')
          .text(
            'This agreement confirms the financed purchase terms under LoanEx. EMI payments are due monthly as per schedule. Late payments may attract overdue status.',
          );
      }

      doc.moveDown();
      doc.fontSize(10).fillColor('#6B7280').text('System-generated document from LoanEx.');
      doc.end();

      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });

    return absolutePath;
  }
}

export const loanService = new LoanService();
export { productImagePath };
