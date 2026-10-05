import React from 'react';
import { Tenant } from '../../../types';
import RlaModal from './RLA';
import SwaModal from './SWA';
import ProgressphotoModal from './Progressphoto';
import MtsModal from './MTS';
import CaModal from './CA';
import AbpModal from './ABP';
import WsModal from './WS';
import PowModal from './POW';
import BsModal from './Bs';
import CmsModal from './CMS';
import EupModal from './EUP';
import FplModal from './FPL';
import MpdsModal from './mpds';
import PertModal from './pert';
import SoteModal from './sote';
import ToaModal from './toa';
import FrsModal from './FRS';
import LmecModal from './LMEC';

// Fields every statutory template modal reads from the active project.
export interface StatutoryHostProject {
  projectReferenceNumber?: string;
  philgepsRefNo?: string;
  title?: string;
  procuringEntity?: string;
  procuringEntityAddress?: string;
  procuringEntityContactPerson?: string;
  headOfProcuringEntity?: string;
  headOfProcuringEntityPosition?: string;
  solicitationNumber?: string;
  approvedBudget?: number;
  areaOfDelivery?: string;
}

export interface StatutoryModalHostProps {
  type: string | null;
  tenant: Tenant | null;
  project: StatutoryHostProject | null;
  /** slotKey = type.toLowerCase(), the key the statutory slot is stored under. */
  onSave: (slotKey: string, dataUrl?: string, name?: string, refNo?: string, title?: string) => void;
  onClose: () => void;
}

const MODALS: Record<string, React.ComponentType<any>> = {
  RLA: RlaModal,
  SWA: SwaModal,
  PROGRESS_PHOTO: ProgressphotoModal,
  MTS: MtsModal,
  CA: CaModal,
  ABP: AbpModal,
  WS: WsModal,
  BS: BsModal,
  CMS: CmsModal,
  EUP: EupModal,
  FPL: FplModal,
  MPDS: MpdsModal,
  PERT: PertModal,
  SOTE: SoteModal,
  TOA: ToaModal,
  FRS: FrsModal,
  LMEC: LmecModal,
};

export const StatutoryModalHost: React.FC<StatutoryModalHostProps> = ({ type, tenant, project, onSave, onClose }) => {
  if (!type) return null;
  const common = {
    tenant,
    activeProjectRefNo: project?.projectReferenceNumber || project?.philgepsRefNo || '',
    activeProjectTitle: project?.title || '',
    activeProcuringEntity: project?.procuringEntity || 'Bids and Awards Committee',
    procuringEntityAddress: project?.procuringEntityAddress || '',
    procuringEntityContactPerson: project?.procuringEntityContactPerson || '',
    headOfProcuringEntity: project?.headOfProcuringEntity || '',
    headOfProcuringEntityPosition: project?.headOfProcuringEntityPosition || '',
    solicitationNumber: project?.solicitationNumber || '',
    contractAmount: project?.approvedBudget || 0,
    projectLocation: project?.areaOfDelivery || '',
    onSaveAndComplete: (dataUrl?: string, name?: string, refNo?: string, title?: string) =>
      onSave(type.toLowerCase(), dataUrl, name, refNo, title),
    onClose,
  };

  // POW is a full-page component elsewhere (the POW tab); here it needs the same overlay the other forms bring.
  if (type === 'POW') {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl my-auto max-h-[96vh] h-[94vh] flex flex-col">
          <PowModal {...common} />
        </div>
      </div>
    );
  }

  const Modal = MODALS[type];
  return Modal ? <Modal {...common} /> : null;
};

export default StatutoryModalHost;
