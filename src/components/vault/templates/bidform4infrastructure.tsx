import React from 'react';
import { Tenant } from '../../../types';
import VaultErrorBoundary from '../../common/VaultErrorBoundary';
import { BidFormForGoodsModalContent } from './bidform4goods';

export interface DiscountOfferRow {
  id: string;
  lotNameDescription: string;
  discountPercentageAmount: string;
  methodology: string;
}

export interface BidFormForInfrastructureModalProps {
  tenant?: Tenant | null;
  activeProjectRefNo?: string;
  activeProjectTitle?: string;
  activeProcuringEntity?: string;
  onSaveAndComplete?: (fileDataUrl?: string, customName?: string, projectRefNo?: string, projectTitle?: string) => void;
  onClose: () => void;
}

export const BidFormForInfrastructureModalContent: React.FC<BidFormForInfrastructureModalProps> = (props) => {
  return <BidFormForGoodsModalContent {...props} />;
};

export const BidFormForInfrastructureModal: React.FC<BidFormForInfrastructureModalProps> = (props) => (
  <VaultErrorBoundary fallbackTitle="Bid Form for Infrastructure Modal">
    <BidFormForGoodsModalContent {...props} />
  </VaultErrorBoundary>
);

export default BidFormForInfrastructureModal;
