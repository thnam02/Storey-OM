import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from './uiStore';

const ui = () => useUiStore.getState();

describe('opening departments the viewer may not see', () => {
  beforeEach(() => {
    useUiStore.setState({ selectedDeptId: null, selectedEmployeeId: null, lockedDeptId: null, openable: null });
  });

  it('shows the locked notice instead of a department or person outside access', () => {
    ui().setOpenable(['finance']);
    ui().selectDept('sales');
    expect([ui().selectedDeptId, ui().lockedDeptId]).toEqual([null, 'sales']);
    ui().selectEmployee('huong-le', 'sales');
    expect([ui().selectedEmployeeId, ui().lockedDeptId]).toEqual([null, 'sales']);
    ui().selectDept('finance');
    expect([ui().selectedDeptId, ui().lockedDeptId]).toEqual(['finance', null]);
  });

  it('locks the open department when access shrinks, and reopens it when access returns', () => {
    ui().selectDept('finance');
    ui().setOpenable(['sales']);
    expect([ui().selectedDeptId, ui().lockedDeptId]).toEqual([null, 'finance']);
    ui().setOpenable(['sales', 'finance']);
    expect([ui().selectedDeptId, ui().lockedDeptId]).toEqual(['finance', null]);
  });
});
