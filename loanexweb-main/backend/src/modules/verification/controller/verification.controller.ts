import { Request, Response } from 'express';
import { sendSuccess } from '../../../common/utils/api-response';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { verificationService } from '../service/verification.service';

function requireUserId(req: AuthenticatedRequest): string {
  return req.user!.sub;
}

export class VerificationController {
  getStatus = async (req: Request, res: Response) => {
    const data = await verificationService.getStatus(requireUserId(req as AuthenticatedRequest));
    return sendSuccess(res, data, 'Verification status fetched');
  };

  getMobileStatus = async (req: Request, res: Response) => {
    const data = await verificationService.getMobileStatus(
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'Mobile verification status fetched');
  };

  // Mobile OTP stubs (mobile already verified via login OTP)
  sendMobileOtp = async (req: Request, res: Response) => {
    return sendSuccess(res, { sent: true }, 'Mobile is already verified via login OTP');
  };

  verifyMobileOtp = async (req: Request, res: Response) => {
    return sendSuccess(res, { verified: true, mobileVerified: true }, 'Mobile already verified');
  };

  // Aadhaar status
  getAadhaarStatus = async (req: Request, res: Response) => {
    const data = await verificationService.getAadhaarStatus(
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'Aadhaar verification status fetched');
  };

  // DigiLocker: Generate token → returns redirect URL
  digilockerGenerate = async (req: Request, res: Response) => {
    const userId = requireUserId(req as AuthenticatedRequest);
    const { aadhaar_number } = (req.body ?? {}) as { aadhaar_number?: string };
    const cleanAadhaar = aadhaar_number ? aadhaar_number.replace(/\s/g, '') : '';
    const data = await verificationService.digilockerGenerate(
      userId,
      cleanAadhaar,
    );
    return sendSuccess(res, data, data.message);
  };

  // DigiLocker: Fetch details after user completes flow
  digilockerFetch = async (req: Request, res: Response) => {
    const userId = requireUserId(req as AuthenticatedRequest);
    const { client_id } = req.body as { client_id: string };
    if (!client_id) {
      res.status(400).json({ success: false, message: 'client_id is required' });
      return;
    }
    const data = await verificationService.digilockerFetch(userId, client_id);
    return sendSuccess(res, data, data.message);
  };

  // Legacy stubs kept for route compatibility
  sendAadhaarOtp = async (req: Request, res: Response) => {
    return sendSuccess(res, {}, 'Use DigiLocker endpoint instead: POST /aadhaar/digilocker/generate');
  };

  verifyAadhaar = async (req: Request, res: Response) => {
    return sendSuccess(res, {}, 'Use DigiLocker endpoint instead: POST /aadhaar/digilocker/fetch');
  };

  verifyPanAndCredit = async (req: Request, res: Response) => {
    const userId = requireUserId(req as AuthenticatedRequest);

    if (!req.body.pan) {
      throw new Error('PAN number is required');
    }

    const data = await verificationService.verifyPanAndCreditScore(userId, req.body);
    return sendSuccess(res, data, data.message);
  };

  faceMatch = async (req: Request, res: Response) => {
    const userId = requireUserId(req as AuthenticatedRequest);
    const { capturedImage } = req.body as { capturedImage: string };
    
    if (!capturedImage) {
      res.status(400).json({ success: false, message: 'capturedImage is required' });
      return;
    }
    
    const data = await verificationService.verifyFaceMatch(userId, capturedImage);
    return sendSuccess(res, data, data.message);
  };
}

export const verificationController = new VerificationController();
