import type { ComponentType } from 'react';
import type { Department, DepartmentId } from '../../data/types';
import { FinanceWorkspace } from './FinanceWorkspace';
import { ImportExportWorkspace } from './ImportExportWorkspace';
import { ManagementWorkspace } from './ManagementWorkspace';
import { MarketingWorkspace } from './MarketingWorkspace';
import { SalesWorkspace } from './SalesWorkspace';
import { WarehouseWorkspace } from './WarehouseWorkspace';

/** Each department's Workspace tab: the CRM content it works with. */
export const WORKSPACES: Record<DepartmentId, ComponentType<{ dept: Department }>> = {
  'import-export': ImportExportWorkspace,
  sales: SalesWorkspace,
  marketing: MarketingWorkspace,
  finance: FinanceWorkspace,
  management: ManagementWorkspace,
  warehouse: WarehouseWorkspace,
};
