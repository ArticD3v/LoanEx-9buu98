import { EmiApplication } from '../../types/emiApplication';
import { FiCase } from '../../types/fiCase';
import { MOCK_FI_CASES } from '../data/mockData';

export function findFiCaseForApplication(application: EmiApplication): FiCase | undefined {
  return MOCK_FI_CASES.find(
    (fiCase) =>
      fiCase.customerName === application.customerName && fiCase.mobile === application.mobile,
  );
}
