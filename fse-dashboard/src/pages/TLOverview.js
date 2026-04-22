import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  Box, Typography, Card, CardContent, Chip, CircularProgress,
  Alert, Button, Avatar, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Collapse, TextField, InputAdornment, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Autocomplete, Skeleton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { BRAND } from '../theme';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';

const EMP_API = process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api';

function initials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function StatusChip({ status }) {
  const map = {
    'Ready for Onboarding':          { bg: '#e6f4ea', color: '#2e7d32' },
    'Not Interested':                { bg: '#fdecea', color: '#c62828' },
    'Try but not done due to error': { bg: '#fff3e0', color: '#e65100' },
    'Need to visit again':           { bg: '#e3f2fd', color: '#1565c0' },
  };
  const s = map[status] || { bg: '#f5f5f5', color: '#555' };
  return (
    <Chip label={status || '–'} size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: 11, maxWidth: 180 }} />
  );
}

function FSEGroup({ fse, forms, verifyMap }) {
  const [expanded, setExpanded] = useState(false);
  const fseForms = forms.filter(f => f.employeeName === fse.newJoinerName);
  const getKey = (f) => { const p = (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim(); return p ? `${f.customerNumber}__${p}` : f.customerNumber; };

  return (
    <Box sx={{ mb: 1, border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
      <Box onClick={() => setExpanded(p => !p)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1, cursor: 'pointer', bgcolor: '#f9fafb',
          '&:hover': { bgcolor: '#f0f7f3' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: BRAND.primary, width: 28, height: 28, fontSize: 11, fontWeight: 700 }}>
            {initials(fse.newJoinerName)}
          </Avatar>
          <Typography fontWeight={600} fontSize={13}>{fse.newJoinerName}</Typography>
          <Typography variant="caption" color="text.secondary">{fse.location}</Typography>
          {fse.newJoinerPhone && <Typography variant="caption" color="text.secondary">· {fse.newJoinerPhone}</Typography>}
          {(fse.email || fse.newJoinerEmailId) && <Typography variant="caption" color="text.secondary">· {fse.email || fse.newJoinerEmailId}</Typography>}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label={`${fseForms.length} forms`} size="small"
            sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700, fontSize: 11 }} />
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </Box>
      </Box>
      <Collapse in={expanded}>
        {fseForms.length === 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ p: 2, display: 'block' }}>
            No forms submitted.
          </Typography>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
                  color: 'text.secondary', borderBottom: '2px solid', borderColor: 'divider' } }}>
                  <TableCell>Customer</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Verification</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fseForms.map(f => {
                  const vs = verifyMap?.[getKey(f)]?.status || 'Not Found';
                  const vColor = vs === 'Fully Verified' ? '#2e7d32' : vs === 'Partially Done' ? '#f57f17' : '#888';
                  const vBg    = vs === 'Fully Verified' ? '#e6f4ea' : vs === 'Partially Done' ? '#fff8e1' : '#f5f5f5';
                  const vLabel = vs === 'Fully Verified' ? '✔ Fully Verified' : vs === 'Partially Done' ? '◑ Partially Done' : vs === 'Not Verified' ? '✗ Not Verified' : '– Not Found';
                  const isManualVerification = verifyMap?.[getKey(f)]?.manualVerification;
                  
                  return (
                    <TableRow key={f._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell><Typography variant="body2" fontWeight={600}>{f.customerName}</Typography></TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{f.customerNumber}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{f.location}</Typography></TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box component="span" sx={{ px: 1, py: 0.3, borderRadius: 10, fontSize: 11, fontWeight: 700, bgcolor: vBg, color: vColor }}>{vLabel}</Box>
                          {isManualVerification && (
                            <Tooltip title={`Manually verified by ${verifyMap[getKey(f)]?.verifiedBy || 'Admin'}`}>
                              <Box component="span" sx={{ fontSize: 11, color: '#7c3aed', cursor: 'help' }}>👤</Box>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{f.tideProduct || f.brand || f.formFillingFor || '–'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {vs === 'Not Found' && !isManualVerification && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.handleManualVerify) {
                                window.handleManualVerify(f);
                              }
                            }}
                            sx={{
                              fontSize: 10,
                              textTransform: 'none',
                              borderColor: '#7c3aed',
                              color: '#7c3aed',
                              px: 1,
                              py: 0.3,
                              minWidth: 'auto',
                              '&:hover': { bgcolor: '#f3e8ff', borderColor: '#6d28d9' }
                            }}>
                            ✓ Verify
                          </Button>
                        )}
                        {isManualVerification && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.handleRevertVerification) {
                                window.handleRevertVerification(f);
                              }
                            }}
                            sx={{
                              fontSize: 10,
                              textTransform: 'none',
                              borderColor: '#d32f2f',
                              color: '#d32f2f',
                              px: 1,
                              py: 0.3,
                              minWidth: 'auto',
                              '&:hover': { bgcolor: '#ffebee', borderColor: '#c62828' }
                            }}>
                            ↺ Revert
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Collapse>
    </Box>
  );
}

function TLCard({ tlData, search, verifyMap, onAssignTask }) {
  const [expanded, setExpanded] = useState(false);
  const [fseFilter, setFseFilter] = useState(null); // null | 'active' | 'inactive'
  const { tl, fses, forms } = tlData;
  const tlName = tl.name || tl.email;

  const activeFSENames = useMemo(() => new Set(forms.map(f => f.employeeName).filter(Boolean)), [forms]);
  const activeFSECount   = fses.filter(f => activeFSENames.has(f.newJoinerName)).length;
  const inactiveFSECount = fses.length - activeFSECount;

  const filteredFSEs = useMemo(() => {
    let list = fses;
    if (fseFilter === 'active')   list = list.filter(f => activeFSENames.has(f.newJoinerName));
    if (fseFilter === 'inactive') list = list.filter(f => !activeFSENames.has(f.newJoinerName));
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(f =>
      (f.newJoinerName || '').toLowerCase().includes(q) ||
      (f.location || '').toLowerCase().includes(q)
    );
  }, [fses, search, fseFilter, activeFSENames]);

  const handleChipClick = (e, type) => {
    e.stopPropagation();
    setFseFilter(prev => prev === type ? null : type);
    setExpanded(true);
  };

  return (
    <Card sx={{ mb: 2, border: `1.5px solid ${BRAND.primaryLight || '#c8e6c9'}`, borderRadius: 2 }}>
      <Box onClick={() => setExpanded(p => !p)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2.5, py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: BRAND.primary, width: 36, height: 36, fontSize: 13, fontWeight: 700 }}>
            {initials(tlName)}
          </Avatar>
          <Box>
            <Typography fontWeight={700}>{tlName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {tl.location || 'No location'} · {tl.phone || ''}
              {tl.email ? ` · ${tl.email}` : ''}
              {tl.reportingManager ? ` · Manager: ${tl.reportingManager}` : ''}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            variant="contained"
            onClick={(e) => { e.stopPropagation(); onAssignTask(tl); }}
            sx={{
              bgcolor: '#7c3aed',
              color: '#fff',
              fontWeight: 700,
              fontSize: 11,
              textTransform: 'none',
              px: 1.5,
              py: 0.5,
              minWidth: 'auto',
              '&:hover': { bgcolor: '#6d28d9' }
            }}>
            📋 Assign Task
          </Button>
          <Chip label={`${activeFSECount} active`} size="small"
            onClick={e => handleChipClick(e, 'active')}
            sx={{ bgcolor: fseFilter === 'active' ? '#2e7d32' : '#e6f4ea',
              color: fseFilter === 'active' ? '#fff' : '#2e7d32',
              fontWeight: 700, fontSize: 11, cursor: 'pointer',
              '&:hover': { bgcolor: '#2e7d32', color: '#fff' } }} />
          {inactiveFSECount > 0 && (
            <Chip label={`${inactiveFSECount} inactive`} size="small"
              onClick={e => handleChipClick(e, 'inactive')}
              sx={{ bgcolor: fseFilter === 'inactive' ? '#c62828' : '#fdecea',
                color: fseFilter === 'inactive' ? '#fff' : '#c62828',
                fontWeight: 700, fontSize: 11, cursor: 'pointer',
                '&:hover': { bgcolor: '#c62828', color: '#fff' } }} />
          )}
          <Chip label={`${fses.length} FSEs`} size="small"
            sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 700, fontSize: 11 }} />
          <Chip label={`${forms.length} forms`} size="small"
            sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700, fontSize: 11 }} />
          {expanded ? <ExpandLessIcon sx={{ color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ px: 2.5, pb: 2 }}>
          {fseFilter && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Showing {fseFilter} FSEs only</Typography>
              <Chip label="Clear filter" size="small" onClick={() => setFseFilter(null)}
                sx={{ fontSize: 10, height: 20, cursor: 'pointer' }} />
            </Box>
          )}
          {filteredFSEs.length === 0 ? (
            <Typography color="text.secondary" variant="body2" sx={{ py: 2 }}>No FSEs found.</Typography>
          ) : (
            filteredFSEs.map(fse => (
              <FSEGroup key={fse._id} fse={fse} forms={forms} verifyMap={verifyMap} />
            ))
          )}
        </Box>
      </Collapse>
    </Card>
  );
}

export default function TLOverview({ firstLoad = true, onLoaded }) {
  const [data,      setData]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [error,     setError]     = useState('');
  const [search,    setSearch]    = useState('');
  const [drillOpen, setDrillOpen] = useState(null);
  const [verifyKpiOpen, setVerifyKpiOpen] = useState(null);
  const [globalVerifyMap, setGlobalVerifyMap] = useState({});
  const [productDrillOpen, setProductDrillOpen] = useState(null); // { status, product }
  const [tlDrillOpen, setTlDrillOpen] = useState(null); // { status, product, tlName, tlData }
  const [chartDrillOpen, setChartDrillOpen] = useState(null); // { tlName, type: 'active'|'inactive', fses, forms }
  const [chartFilter, setChartFilter] = useState('both'); // 'both' | 'active' | 'inactive'
  const [fseForms, setFseForms] = useState(null); // { fseName, forms }
  const [drillSearch, setDrillSearch] = useState('');
  const [fromDate,   setFromDate]   = useState('');
  const [toDate,     setToDate]     = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  
  // Assign Task Modal
  const [assignTaskOpen, setAssignTaskOpen] = useState(false);
  const [selectedTL, setSelectedTL] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', instructions: '', priority: 'normal', deadline: '' });
  const [submitting, setSubmitting] = useState(false);
  
  // Manual Verification Modal
  const [manualVerifyOpen, setManualVerifyOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [verifyReason, setVerifyReason] = useState('');
  const [verifyingManually, setVerifyingManually] = useState(false);
  
  // Admin Notifications
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  
  // All Tasks Section
  const [allTasks, setAllTasks] = useState([]);
  const [taskFilter, setTaskFilter] = useState('all'); // 'all', 'pending', 'completed'
  const [showAllTasks, setShowAllTasks] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${EMP_API}/forms/admin/tl-overview`);
      if (!res.ok) throw new Error('Failed to load TL data');
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setPageLoading(false);
      if (onLoaded) onLoaded();
    }
  }, []);

  const loadAdminNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${EMP_API}/tasks/admin-notifications`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const notifications = await res.json();
        setAdminNotifications(notifications);
        setNotificationCount(notifications.length);
      } else {
        console.error('Failed to load notifications:', await res.text());
      }
    } catch (err) {
      console.error('Failed to load admin notifications:', err);
    }
  }, []);

  const loadAllTasks = useCallback(async () => {
    try {
      const statusParam = taskFilter !== 'all' ? `?status=${taskFilter}` : '';
      const res = await fetch(`${EMP_API}/tasks/admin-all-tasks${statusParam}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const tasks = await res.json();
        setAllTasks(tasks);
      } else {
        console.error('Failed to load all tasks:', await res.text());
      }
    } catch (err) {
      console.error('Failed to load all tasks:', err);
    }
  }, [taskFilter]);

  useEffect(() => { load(); loadAdminNotifications(); }, [load, loadAdminNotifications]);

  useEffect(() => {
    if (showAllTasks) {
      loadAllTasks();
    }
  }, [showAllTasks, taskFilter, loadAllTasks]);

  const allForms = useMemo(() => {
    const seen = new Set();
    return data.flatMap(d => d.forms).filter(f => {
      const id = String(f._id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [data]);
  const allFSEs  = useMemo(() => data.flatMap(d => d.fses),  [data]);

  // Apply date filter to all forms
  const filteredAllForms = useMemo(() => {
    const now        = new Date();
    const today      = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart  = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return allForms.filter(f => {
      const d = new Date(f.createdAt);
      if (dateFilter === 'today'  && d < today)      return false;
      if (dateFilter === 'week'   && d < weekStart)  return false;
      if (dateFilter === 'month'  && d < monthStart) return false;
      if (dateFilter === 'custom') {
        if (fromDate && d < new Date(fromDate))              return false;
        if (toDate   && d > new Date(toDate + 'T23:59:59')) return false;
      }
      return true;
    });
  }, [allForms, dateFilter, fromDate, toDate]);

  // Bulk verify all filtered forms
  useEffect(() => {
    if (!filteredAllForms.length) { setGlobalVerifyMap({}); return; }
    const getP = (f) => (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim();
    const BATCH = 50;
    const batches = [];
    for (let i = 0; i < filteredAllForms.length; i += BATCH) batches.push(filteredAllForms.slice(i, i + BATCH));
    Promise.all(batches.map(batch => {
      const phones   = batch.map(f => f.customerNumber).join(',');
      const names    = batch.map(f => encodeURIComponent(f.customerName || '')).join(',');
      const products = batch.map(f => encodeURIComponent(getP(f))).join(',');
      const months   = batch.map(f => encodeURIComponent(new Date(f.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' }))).join(',');
      return fetch(`${EMP_API}/verify/bulk-admin?phones=${encodeURIComponent(phones)}&names=${names}&products=${products}&months=${months}`)
        .then(r => r.ok ? r.json() : {}).catch(() => ({}));
    })).then(results => setGlobalVerifyMap(Object.assign({}, ...results)));
  }, [filteredAllForms]); // eslint-disable-line

  const getFormKey = (f) => { const p = (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim(); return p ? `${f.customerNumber}__${p}` : f.customerNumber; };

  const verifyCounts = useMemo(() => {
    const counts = { 'Fully Verified': 0, 'Partially Done': 0, 'Not Found': 0 };
    filteredAllForms.forEach(f => {
      const s = globalVerifyMap[getFormKey(f)]?.status || 'Not Found';
      if (s === 'Fully Verified') counts['Fully Verified']++;
      else if (s === 'Partially Done') counts['Partially Done']++;
      else counts['Not Found']++;
    });
    return counts;
  }, [filteredAllForms, globalVerifyMap]); // eslint-disable-line

  const tlOptions = useMemo(() => data.map(d => d.tl.name || d.tl.email || '').filter(Boolean).sort(), [data]);

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(d =>
      (d.tl.name || d.tl.email || '').toLowerCase().includes(q) ||
      (d.tl.location || '').toLowerCase().includes(q)
    );
  }, [data, search]);

  const totalFSEs  = data.reduce((s, d) => s + d.fses.length, 0);
  const totalForms = filteredAllForms.length;

  const handleMarkAsRead = async (taskId) => {
    try {
      const res = await fetch(`${EMP_API}/tasks/admin-notifications/${taskId}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (res.ok) {
        // Reload notifications to update the list
        await loadAdminNotifications();
        
        // Close modal if no more notifications
        if (adminNotifications.length <= 1) {
          setNotificationOpen(false);
        }
      } else {
        console.error('Failed to mark as read:', await res.text());
      }
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleAssignTask = (tl) => {
    setSelectedTL(tl);
    setTaskForm({ title: '', instructions: '', priority: 'normal', deadline: '' });
    setAssignTaskOpen(true);
  };

  const handleManualVerify = (form) => {
    setSelectedForm(form);
    setVerifyReason('');
    setManualVerifyOpen(true);
  };

  // Make handler available globally for FSEGroup component
  useEffect(() => {
    window.handleManualVerify = handleManualVerify;
    window.handleRevertVerification = handleRevertVerification;
    return () => {
      delete window.handleManualVerify;
      delete window.handleRevertVerification;
    };
  }, []);

  const handleRevertVerification = async (form) => {
    const confirmRevert = window.confirm(
      `Are you sure you want to revert the manual verification for:\n\n` +
      `Customer: ${form.customerName}\n` +
      `Phone: ${form.customerNumber}\n` +
      `Product: ${form.formFillingFor || form.tideProduct || form.brand || '–'}\n\n` +
      `This will change the status back to "Not Found".`
    );

    if (!confirmRevert) return;

    try {
      const product = (form.formFillingFor || form.tideProduct || form.brand || '').toLowerCase().trim();
      const month = new Date(form.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' });

      // First, check if manual verification exists
      const checkRes = await fetch(
        `${EMP_API}/manual-verification/check?phone=${encodeURIComponent(form.customerNumber)}&product=${encodeURIComponent(product)}&month=${encodeURIComponent(month)}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!checkRes.ok) {
        throw new Error('Failed to check manual verification');
      }

      const checkData = await checkRes.json();

      if (!checkData.exists || !checkData.verification) {
        alert('❌ No manual verification found for this form');
        return;
      }

      // Delete the manual verification
      const deleteRes = await fetch(`${EMP_API}/manual-verification/${checkData.verification._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!deleteRes.ok) {
        const err = await deleteRes.json();
        throw new Error(err.message || 'Failed to delete manual verification');
      }

      alert(`✅ Manual verification reverted successfully!\n\nThe form will now show "Not Found" status.`);
      
      // Reload the page data
      load();

    } catch (err) {
      console.error('Failed to revert manual verification:', err);
      alert(`❌ Failed to revert verification: ${err.message}`);
    }
  };

  const handleSubmitManualVerification = async () => {
    if (!selectedForm) return;

    setVerifyingManually(true);
    try {
      const adminEmail = localStorage.getItem('userEmail') || 'Admin';
      const product = (selectedForm.formFillingFor || selectedForm.tideProduct || selectedForm.brand || '').toLowerCase().trim();
      const month = new Date(selectedForm.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' });

      const res = await fetch(`${EMP_API}/manual-verification/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedForm.customerNumber,
          product: product,
          month: month,
          status: 'Fully Verified',
          verifiedBy: adminEmail,
          reason: verifyReason || 'Manual verification by admin - No automated rules available',
          formId: selectedForm._id
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create manual verification');
      }

      alert(`✅ Form manually verified successfully!\n\nCustomer: ${selectedForm.customerName}\nPhone: ${selectedForm.customerNumber}\nProduct: ${product}`);
      
      // Refresh verification data
      setManualVerifyOpen(false);
      setSelectedForm(null);
      setVerifyReason('');
      
      // Reload the page data to show updated verification status
      load();

    } catch (err) {
      console.error('Failed to create manual verification:', err);
      alert(`❌ Failed to verify form: ${err.message}`);
    } finally {
      setVerifyingManually(false);
    }
  };

  const handleSubmitTask = async () => {
    if (!taskForm.title.trim() || !taskForm.instructions.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    if (taskForm.priority === 'urgent' && !taskForm.deadline) {
      alert('Urgent tasks must have a deadline');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${EMP_API}/tasks/admin-to-tl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tlId: selectedTL._id,
          title: taskForm.title.trim(),
          instructions: taskForm.instructions.trim(),
          priority: taskForm.priority,
          deadline: taskForm.deadline || null
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to assign task');
      }

      alert(`Task assigned to ${selectedTL.name || selectedTL.email} successfully!`);
      setAssignTaskOpen(false);
      setSelectedTL(null);
      setTaskForm({ title: '', instructions: '', priority: 'normal', deadline: '' });
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      {/* Page Loader */}
      {pageLoading && ReactDOM.createPortal(
        <div style={{
          position: 'fixed', inset: 0,
          zIndex: 1099, background: '#f0f7f3',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <style>{`@keyframes tlSpinner { to { transform: rotate(360deg); } }`}</style>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            border: '4px solid rgba(26,71,49,0.15)',
            borderTop: '4px solid #1a4731',
            animation: 'tlSpinner 0.9s linear infinite',
          }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a4731', letterSpacing: 3, textTransform: 'uppercase' }}>
            TL Overview
          </div>
        </div>,
        document.body
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2, visibility: pageLoading ? 'hidden' : 'visible' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.primary }}>TL Overview</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            All Team Leaders with their FSEs and merchant submissions
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {/* Notification Bell */}
          <Tooltip title="TL Task Notifications">
            <Box sx={{ position: 'relative', cursor: 'pointer' }} onClick={() => setNotificationOpen(true)}>
              <Box sx={{ 
                width: 44, 
                height: 44, 
                borderRadius: '50%', 
                bgcolor: notificationCount > 0 ? '#7c3aed' : '#f5f5f5',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                transition: 'all 0.2s',
                '&:hover': { transform: 'scale(1.1)', bgcolor: notificationCount > 0 ? '#6d28d9' : '#e0e0e0' }
              }}>
                <Typography sx={{ fontSize: 20 }}>🔔</Typography>
              </Box>
              {notificationCount > 0 && (
                <Box sx={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  bgcolor: '#d32f2f',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                  border: '2px solid #fff'
                }}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Box>
              )}
            </Box>
          </Tooltip>
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={() => { load(); loadAdminNotifications(); }}
            sx={{ borderColor: BRAND.primary, color: BRAND.primary, fontWeight: 700 }}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Date Filter Bar */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'today', 'week', 'month'].map(f => (
          <Button key={f} size="small"
            variant={dateFilter === f ? 'contained' : 'outlined'}
            onClick={() => { setDateFilter(f); setFromDate(''); setToDate(''); }}
            sx={{ fontWeight: 700, textTransform: 'capitalize',
              bgcolor: dateFilter === f ? BRAND.primary : 'transparent',
              borderColor: BRAND.primary, color: dateFilter === f ? '#fff' : BRAND.primary,
              '&:hover': { bgcolor: dateFilter === f ? '#0f3320' : '#e6f4ea' } }}>
            {f === 'all' ? 'All' : f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
          </Button>
        ))}
        <TextField size="small" type="date" label="From" value={fromDate}
          onChange={e => { setFromDate(e.target.value); setDateFilter('custom'); }}
          InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
        <TextField size="small" type="date" label="To" value={toDate}
          onChange={e => { setToDate(e.target.value); setDateFilter('custom'); }}
          InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
        {(dateFilter !== 'all' || fromDate || toDate) && (
          <Button size="small" variant="outlined" color="error"
            onClick={() => { setDateFilter('all'); setFromDate(''); setToDate(''); }}
            sx={{ fontWeight: 700 }}>Reset</Button>
        )}
      </Box>

      {/* Summary KPIs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: 'Total Submissions', value: totalForms,  color: BRAND.primary, key: 'forms' },
          { label: 'Total TLs',         value: data.length, color: '#7c3aed',     key: 'tls' },
          { label: 'Total FSEs',        value: totalFSEs,   color: '#1565c0',     key: 'fses' },
        ].map(k => (
          <Card key={k.label} sx={{ borderRadius: 3, border: `1.5px solid ${k.color}20`, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 16px ${k.color}30` } }}
            onClick={() => {
              if (k.key === 'tls') {
                setDrillOpen({ title: 'Total TLs', color: '#7c3aed', cols: ['Name', 'Email', 'Phone', 'Location', 'Manager', 'Status'], rows: data.map(d => ({ name: d.tl.name, email: d.tl.email, phone: d.tl.phone || '–', location: d.tl.location || '–', manager: d.tl.reportingManager || '–', status: d.tl.status || '–' })) });
              } else if (k.key === 'fses') {
                setDrillOpen({ title: 'Total FSEs', color: '#1565c0', cols: ['Name', 'Email', 'Phone', 'TL', 'Status'], rows: allFSEs.map(e => ({ name: e.newJoinerName || e.name, email: e.email || e.newJoinerEmailId || '–', phone: e.newJoinerPhone || e.phone || '–', tl: e.reportingManager || '–', status: e.status || '–' })) });
              } else {
                setDrillOpen({ title: 'Total Forms', color: '#e65100', cols: ['Customer', 'Phone', 'FSE', 'Product', 'Status', 'Date'], rows: filteredAllForms.map(f => ({ customer: f.customerName || '–', phone: f.customerNumber || '–', fse: f.employeeName || '–', product: f.formFillingFor || f.brand || '–', status: f.status || '–', date: new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) })) });
              }
            }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="h4" fontWeight={800} sx={{ color: k.color }}>{k.value}</Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>{k.label}</Typography>
              <Typography variant="caption" sx={{ color: k.color, opacity: 0.7 }}>click to explore ↗</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Verification KPIs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: '✓ Fully Verified',  key: 'Fully Verified',  color: '#2e7d32', bg: '#e6f4ea', icon: '✓' },
          { label: '◑ Partially Done',  key: 'Partially Done',  color: '#f57f17', bg: '#fff8e1', icon: '◑' },
          { label: '– Not Found',       key: 'Not Found',       color: '#888',    bg: '#f5f5f5', icon: '–' },
        ].map(k => (
          <Card key={k.key} onClick={() => setVerifyKpiOpen(verifyKpiOpen === k.key ? null : k.key)}
            sx={{ borderRadius: 3, bgcolor: k.bg, border: `1.5px solid ${k.color}30`, cursor: 'pointer',
              outline: verifyKpiOpen === k.key ? `2px solid ${k.color}` : 'none',
              transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 16px ${k.color}30` } }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" fontWeight={700} sx={{ color: k.color }}>{k.label}</Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: k.color }}>{verifyCounts[k.key] || 0}</Typography>
              <Typography variant="caption" sx={{ color: k.color, opacity: 0.7 }}>click for breakdown</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Verification breakdown — Product Breakdown modal style */}
      {verifyKpiOpen && (() => {
        const color = { 'Fully Verified': '#2e7d32', 'Partially Done': '#f57f17', 'Not Found': '#888' }[verifyKpiOpen];
        const statusForms = filteredAllForms.filter(f => (globalVerifyMap[getFormKey(f)]?.status || 'Not Found') === verifyKpiOpen);

        // Build per-product breakdown
        const productMap = {};
        filteredAllForms.forEach(f => {
          const rawProduct = f.formFillingFor || f.tideProduct || f.brand || 'Other';
          const product = rawProduct.toLowerCase() === 'msme' ? 'Tide MSME' : rawProduct;
          if (!productMap[product]) productMap[product] = { total: 0, matched: 0 };
          productMap[product].total++;
          if ((globalVerifyMap[getFormKey(f)]?.status || 'Not Found') === verifyKpiOpen) productMap[product].matched++;
        });
        const breakdown = Object.entries(productMap).filter(([, v]) => v.matched > 0).sort((a, b) => b[1].matched - a[1].matched);

        return (
          <Dialog open onClose={() => setVerifyKpiOpen(null)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Typography variant="h6" component="span" fontWeight={800} sx={{ color }}>{verifyKpiOpen} — Product Breakdown</Typography>
              <IconButton onClick={() => setVerifyKpiOpen(null)} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Product', verifyKpiOpen.toUpperCase(), 'Total Submitted', '% Rate', 'Details'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary', borderBottom: `2px solid ${color}30` }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {breakdown.map(([product, v]) => {
                    const rate = Math.round((v.matched / v.total) * 100);
                    return (
                      <TableRow key={product} hover>
                        <TableCell>
                          <Box component="span" sx={{ px: 1.5, py: 0.4, borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1px solid ${color}40`, color }}>{product}</Box>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, fontSize: 16, color }}>{v.matched}</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{v.total}</TableCell>
                        <TableCell>
                          <Box component="span" sx={{ px: 1.5, py: 0.4, borderRadius: 20, fontSize: 12, fontWeight: 700, bgcolor: '#e6f4ea', color: '#2e7d32' }}>{rate}%</Box>
                        </TableCell>
                        <TableCell>
                          <Button size="small" sx={{ fontWeight: 700, color, minWidth: 0 }}
                            onClick={() => setProductDrillOpen({ status: verifyKpiOpen, product })}>
                            View ›
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {breakdown.length === 0 && (
                    <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>No data found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 1.5 }}>
              <Button onClick={() => setVerifyKpiOpen(null)} variant="contained" sx={{ bgcolor: color, fontWeight: 700 }}>Close</Button>
            </DialogActions>
          </Dialog>
        );
      })()}

      {/* Product drill-down — Level 1: TL list */}
      {productDrillOpen && !tlDrillOpen && (() => {
        const color = { 'Fully Verified': '#2e7d32', 'Partially Done': '#f57f17', 'Not Found': '#888' }[productDrillOpen.status];
        const getKey = (f) => { const p = (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim(); return p ? `${f.customerNumber}__${p}` : f.customerNumber; };

        // Build TL-level summary for this product+status
        const tlSummary = data.map(d => {
          const matchForms = d.forms.filter(f =>
            (globalVerifyMap[getKey(f)]?.status || 'Not Found') === productDrillOpen.status &&
            (f.formFillingFor || f.brand || 'Other') === productDrillOpen.product
          );
          const fseNames = [...new Set(matchForms.map(f => f.employeeName).filter(Boolean))];
          return { tl: d.tl, forms: matchForms, fseNames, fseCount: fseNames.length };
        }).filter(t => t.forms.length > 0);

        return (
          <Dialog open onClose={() => setProductDrillOpen(null)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" component="span" fontWeight={800} sx={{ color }}>{productDrillOpen.product} — {productDrillOpen.status}</Typography>
                <Typography variant="body2" color="text.secondary">{tlSummary.length} TLs · {tlSummary.reduce((s, t) => s + t.forms.length, 0)} forms</Typography>
              </Box>
              <IconButton onClick={() => setProductDrillOpen(null)} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['#', 'Team Leader', 'Manager', 'FSEs', 'Forms', 'Details'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary', borderBottom: `2px solid ${color}30` }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tlSummary.map((t, i) => (
                    <TableRow key={t.tl._id || i} hover>
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{i + 1}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ bgcolor: BRAND.primary, width: 28, height: 28, fontSize: 11, fontWeight: 700 }}>{initials(t.tl.name)}</Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{t.tl.name || t.tl.email}</Typography>
                            <Typography variant="caption" color="text.secondary">{t.tl.location || '–'}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{t.tl.reportingManager || '–'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {t.fseNames.map(n => (
                            <Chip key={n} label={n} size="small" sx={{ fontSize: 10, height: 20 }} />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box component="span" sx={{ px: 1.5, py: 0.4, borderRadius: 20, fontSize: 12, fontWeight: 700, bgcolor: `${color}15`, color }}>{t.forms.length}</Box>
                      </TableCell>
                      <TableCell>
                        <Button size="small" sx={{ fontWeight: 700, color, minWidth: 0 }}
                          onClick={() => setTlDrillOpen({ status: productDrillOpen.status, product: productDrillOpen.product, tlName: t.tl.name || t.tl.email, tlData: t })}>
                          View ›
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tlSummary.length === 0 && (
                    <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>No data found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 1.5 }}>
              <Button onClick={() => setProductDrillOpen(null)} variant="contained" sx={{ bgcolor: color, fontWeight: 700 }}>Close</Button>
            </DialogActions>
          </Dialog>
        );
      })()}

      {/* Product drill-down — Level 2: FSE forms for selected TL */}
      {tlDrillOpen && (() => {
        const color = { 'Fully Verified': '#2e7d32', 'Partially Done': '#f57f17', 'Not Found': '#888' }[tlDrillOpen.status];
        const getKey = (f) => { const p = (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim(); return p ? `${f.customerNumber}__${p}` : f.customerNumber; };
        const { tlData } = tlDrillOpen;

        // Group forms by FSE
        const fseGroups = {};
        tlData.forms.forEach(f => {
          const name = f.employeeName || 'Unknown';
          if (!fseGroups[name]) fseGroups[name] = [];
          fseGroups[name].push(f);
        });

        return (
          <Dialog open onClose={() => setTlDrillOpen(null)} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" component="span" fontWeight={800} sx={{ color }}>👤 {tlDrillOpen.tlName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {tlDrillOpen.product} · {tlDrillOpen.status} · {tlData.forms.length} forms · Manager: {tlData.tl.reportingManager || '–'}
                </Typography>
              </Box>
              <IconButton onClick={() => setTlDrillOpen(null)} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 2 }}>
              {Object.entries(fseGroups).map(([fseName, fseForms]) => (
                <Box key={fseName} sx={{ mb: 2, border: `1px solid ${color}30`, borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ px: 2, py: 1, bgcolor: `${color}10`, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ bgcolor: color, width: 26, height: 26, fontSize: 10, fontWeight: 700 }}>{initials(fseName)}</Avatar>
                    <Typography fontWeight={700} fontSize={13} sx={{ color }}>{fseName}</Typography>
                    {fseName === tlDrillOpen.tlName && (
                      <Chip label="TL's own forms" size="small" sx={{ fontSize: 10, height: 18, bgcolor: color, color: '#fff', fontWeight: 700, ml: 0.5 }} />
                    )}
                    <Chip label={`${fseForms.length} forms`} size="small" sx={{ bgcolor: `${color}20`, color, fontWeight: 700, fontSize: 10, ml: 'auto' }} />
                  </Box>
                  <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {['#', 'Customer', 'Phone', 'Location', 'Verification', 'Product', 'Date'].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', color: 'text.secondary' }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {fseForms.map((f, i) => {
                          const vs = globalVerifyMap[getKey(f)]?.status || 'Not Found';
                          const vColor = vs === 'Fully Verified' ? '#2e7d32' : vs === 'Partially Done' ? '#f57f17' : '#888';
                          const vBg    = vs === 'Fully Verified' ? '#e6f4ea' : vs === 'Partially Done' ? '#fff8e1' : '#f5f5f5';
                          const vLabel = vs === 'Fully Verified' ? '✔ Fully Verified' : vs === 'Partially Done' ? '◑ Partially Done' : '– Not Found';
                          return (
                            <TableRow key={f._id || i} hover>
                              <TableCell sx={{ color: 'text.secondary' }}>{i + 1}</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{f.customerName || '–'}</TableCell>
                              <TableCell sx={{ fontFamily: 'monospace' }}>{f.customerNumber || '–'}</TableCell>
                              <TableCell sx={{ color: 'text.secondary' }}>{f.location || '–'}</TableCell>
                              <TableCell><Box component="span" sx={{ px: 1, py: 0.3, borderRadius: 10, fontSize: 11, fontWeight: 700, bgcolor: vBg, color: vColor }}>{vLabel}</Box></TableCell>
                              <TableCell sx={{ fontSize: 11 }}>{f.tideProduct || f.formFillingFor || f.brand || '–'}</TableCell>
                              <TableCell sx={{ color: 'text.secondary', fontSize: 11 }}>{new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 1.5 }}>
              <Button onClick={() => setTlDrillOpen(null)} sx={{ color, fontWeight: 700 }}>← Back to TL List</Button>
              <Button onClick={() => { setTlDrillOpen(null); setProductDrillOpen(null); }} variant="contained" sx={{ bgcolor: color, fontWeight: 700 }}>Close</Button>
            </DialogActions>
          </Dialog>
        );
      })()}

      {/* FSE Active / Inactive Charts */}
      {!loading && data.length > 0 && (() => {
        const chartData = data.map(d => {
          const activeNames = new Set(filteredAllForms.filter(f => d.fses.some(fse => fse.newJoinerName === f.employeeName)).map(f => f.employeeName).filter(Boolean));
          const activeFSEs   = d.fses.filter(f => activeNames.has(f.newJoinerName));
          const inactiveFSEs = d.fses.filter(f => !activeNames.has(f.newJoinerName));
          return {
            name: (d.tl.name || d.tl.email || '–').split(' ')[0],
            fullName: d.tl.name || d.tl.email || '–',
            Active: activeFSEs.length,
            Inactive: inactiveFSEs.length,
            activeFSEs,
            inactiveFSEs,
            forms: d.forms,
          };
        }).filter(d => d.Active + d.Inactive > 0);

        const totalActive   = chartData.reduce((s, d) => s + d.Active, 0);
        const totalInactive = chartData.reduce((s, d) => s + d.Inactive, 0);

        const handleBarClick = (barData, type) => {
          if (!barData?.fullName) return;
          setChartDrillOpen({ tlName: barData.fullName, type,
            fses: type === 'active' ? barData.activeFSEs : barData.inactiveFSEs,
            forms: barData.forms,
          });
        };

        const CustomTooltip = ({ active, payload, label }) => {
          if (!active || !payload?.length) return null;
          const total = (payload[0]?.value || 0) + (payload[1]?.value || 0);
          return (
            <Box sx={{
              bgcolor: '#fff', borderRadius: '10px', px: 2, py: 1.5,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 140,
              border: '1px solid #f1f5f9'
            }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#0f172a', mb: 1 }}>{label}</Typography>
              {payload.map(p => (
                <Box key={p.dataKey} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3, mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: p.dataKey === 'Active' ? '#22c55e' : '#ef4444' }} />
                    <Typography sx={{ fontSize: 12, color: '#64748b' }}>{p.dataKey}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{p.value}</Typography>
                </Box>
              ))}
              <Box sx={{ mt: 1, pt: 0.8, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>Total</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{total}</Typography>
              </Box>
            </Box>
          );
        };

        return (
          <Card sx={{
            borderRadius: '16px', mb: 3, overflow: 'hidden',
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
            border: 'none',
          }}>
            <Box sx={{ px: 3, pt: 3, pb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography fontWeight={700} sx={{ fontSize: 17, color: '#0f172a', letterSpacing: -0.4 }}>Employee Activity Overview</Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: 12 }}>Active vs Inactive FSEs per Team Leader · click any bar to explore</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                {[
                  { label: 'Active', value: totalActive, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', type: 'active' },
                  { label: 'Inactive', value: totalInactive, color: '#dc2626', bg: '#fef2f2', border: '#fecaca', type: 'inactive' },
                ].map(s => {
                  const isOn = chartFilter === 'both' || chartFilter === s.type;
                  return (
                    <Box key={s.label} onClick={() => setChartFilter(prev => prev === s.type ? 'both' : s.type)}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 1.5, py: 0.7, borderRadius: 20,
                        bgcolor: isOn ? s.color : s.bg,
                        border: `1.5px solid ${isOn ? s.color : s.border}`,
                        cursor: 'pointer', transition: 'all 0.18s',
                        opacity: isOn ? 1 : 0.6,
                        '&:hover': { opacity: 1, transform: 'translateY(-1px)' } }}>
                      <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: isOn ? '#fff' : s.color }} />
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: isOn ? '#fff' : s.color }}>{s.label}</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: isOn ? '#fff' : s.color }}>{s.value}</Typography>
                    </Box>
                  );
                })}
                {chartFilter !== 'both' && (
                  <Box onClick={() => setChartFilter('both')}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.2, py: 0.7, borderRadius: 20,
                      bgcolor: '#f8fafc', border: '1.5px solid #e2e8f0', cursor: 'pointer',
                      '&:hover': { bgcolor: '#f1f5f9' } }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>↺ Reset</Typography>
                  </Box>
                )}
              </Box>
            </Box>
            <CardContent sx={{ pt: 0, pb: '12px !important', px: '20px' }}>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={chartData} margin={{ top: 12, right: 16, bottom: 8, left: 0 }} barCategoryGap="20%" barGap={4} barSize={32}>
                  <defs>
                    <linearGradient id="tlActiveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" /><stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                    <linearGradient id="tlInactiveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f87171" /><stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name"
                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} height={44}
                    axisLine={false} tickLine={false} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false} tickLine={false} width={24} />
                  <RechartsTooltip content={<CustomTooltip />}
                    cursor={{ fill: 'rgba(148,163,184,0.08)', radius: 6 }} />
                  <Bar dataKey="Active" fill="url(#tlActiveGrad)" radius={[6,6,0,0]} cursor="pointer"
                    hide={chartFilter === 'inactive'} onClick={(barData) => handleBarClick(barData, 'active')} />
                  <Bar dataKey="Inactive" fill="url(#tlInactiveGrad)" radius={[6,6,0,0]} cursor="pointer"
                    hide={chartFilter === 'active'} onClick={(barData) => handleBarClick(barData, 'inactive')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      })()}

      {/* Chart Drill-down Modal */}
      {chartDrillOpen && (() => {
        const isActive = chartDrillOpen.type === 'active';
        const color    = isActive ? '#2e7d32' : '#c62828';
        const bg       = isActive ? '#e6f4ea' : '#fdecea';
        const { fses, forms, tlName, label } = chartDrillOpen;
        return (
          <>
          <Dialog open onClose={() => setChartDrillOpen(null)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ color }}>{label || (isActive ? '✓ Active' : '✗ Inactive')} FSEs — {tlName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {fses.length} FSE{fses.length !== 1 ? 's' : ''} · {forms.length} form{forms.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
              <IconButton onClick={() => setChartDrillOpen(null)} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
              {fses.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No FSEs found.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary', borderBottom: `2px solid ${color}30`, bgcolor: bg } }}>
                      <TableCell>#</TableCell><TableCell>FSE Name</TableCell><TableCell>Phone</TableCell>
                      <TableCell>Location</TableCell><TableCell>Email</TableCell>
                      {isActive && <TableCell align="right">Forms</TableCell>}
                      {isActive && <TableCell align="right">Details</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fses.map((fse, i) => {
                      const fseName  = fse.newJoinerName;
                      const fseForms_ = forms.filter(f => f.employeeName === fseName);
                      const location = fse.location || fse.newJoinerLocation || fseForms_[0]?.location || '–';
                      return (
                        <TableRow key={fse._id || i} hover sx={{ '&:last-child td': { border: 0 } }}>
                          <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{i + 1}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ bgcolor: color, width: 28, height: 28, fontSize: 11, fontWeight: 700 }}>{initials(fseName)}</Avatar>
                              <Typography variant="body2" fontWeight={700}>{fseName || '–'}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fse.newJoinerPhone || '–'}</TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{location}</TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{fse.email || fse.newJoinerEmailId || '–'}</TableCell>
                          {isActive && <TableCell align="right"><Box component="span" sx={{ px: 1.5, py: 0.3, borderRadius: 10, fontSize: 12, fontWeight: 700, bgcolor: '#e6f4ea', color: '#2e7d32' }}>{fseForms_.length} forms</Box></TableCell>}
                          {isActive && <TableCell align="right"><Button size="small" sx={{ fontWeight: 700, color, minWidth: 0, fontSize: 11 }} onClick={() => setFseForms({ fseName, forms: fseForms_ })}>View ›</Button></TableCell>}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 1.5 }}>
              <Button onClick={() => setChartDrillOpen(null)} variant="contained" sx={{ bgcolor: color, fontWeight: 700 }}>Close</Button>
            </DialogActions>
          </Dialog>
          {fseForms && (
            <Dialog open onClose={() => setFseForms(null)} maxWidth="md" fullWidth>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" fontWeight={800} sx={{ color: '#2e7d32' }}>📋 {fseForms.fseName}</Typography>
                  <Typography variant="body2" color="text.secondary">{fseForms.forms.length} form{fseForms.forms.length !== 1 ? 's' : ''} submitted</Typography>
                </Box>
                <IconButton onClick={() => setFseForms(null)} size="small"><CloseIcon /></IconButton>
              </DialogTitle>
              <DialogContent dividers sx={{ p: 0 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary', borderBottom: '2px solid #e6f4ea', bgcolor: '#f9fafb' } }}>
                      <TableCell>#</TableCell><TableCell>Customer</TableCell><TableCell>Phone</TableCell>
                      <TableCell>Location</TableCell><TableCell>Product</TableCell><TableCell>Status</TableCell><TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fseForms.forms.map((f, i) => (
                      <TableRow key={f._id || i} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ color: 'text.secondary' }}>{i + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{f.customerName || '–'}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{f.customerNumber || '–'}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{f.location || '–'}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{f.formFillingFor || f.tideProduct || f.brand || '–'}</TableCell>
                        <TableCell>
                          <Box component="span" sx={{ px: 1, py: 0.3, borderRadius: 10, fontSize: 11, fontWeight: 700,
                            bgcolor: f.status === 'Ready for Onboarding' ? '#e6f4ea' : f.status === 'Not Interested' ? '#fdecea' : '#fff3e0',
                            color:   f.status === 'Ready for Onboarding' ? '#2e7d32' : f.status === 'Not Interested' ? '#c62828' : '#e65100' }}>
                            {f.status || '–'}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 11 }}>
                          {new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 1.5 }}>
                <Button onClick={() => setFseForms(null)} sx={{ color: '#2e7d32', fontWeight: 700 }}>← Back</Button>
                <Button onClick={() => { setFseForms(null); setChartDrillOpen(null); }} variant="contained" sx={{ bgcolor: '#2e7d32', fontWeight: 700 }}>Close</Button>
              </DialogActions>
            </Dialog>
          )}
          </>
        );
      })()}

      {/* Search */}
      <Autocomplete
        size="small" options={tlOptions} value={search || null} freeSolo
        onInputChange={(_, v) => setSearch(v || '')}
        renderInput={(params) => (
          <TextField {...params} placeholder="Search by TL name or location…"
            slotProps={{ input: { ...params.InputProps, startAdornment: <><SearchIcon sx={{ color: 'text.secondary', mr: 0.5 }} />{params.InputProps.startAdornment}</> } }} />
        )}
        sx={{ mb: 3 }} />

      {/* All Tasks Section */}
      <Card sx={{ mb: 3, borderRadius: 3, border: '1.5px solid #7c3aed20' }}>
        <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ color: '#7c3aed' }}>📋 All Admin Tasks</Typography>
            <Typography variant="caption" color="text.secondary">View all tasks assigned to Team Leaders</Typography>
          </Box>
          <Button 
            variant={showAllTasks ? 'contained' : 'outlined'}
            onClick={() => setShowAllTasks(!showAllTasks)}
            sx={{ 
              bgcolor: showAllTasks ? '#7c3aed' : 'transparent',
              borderColor: '#7c3aed',
              color: showAllTasks ? '#fff' : '#7c3aed',
              fontWeight: 700,
              '&:hover': { bgcolor: showAllTasks ? '#6d28d9' : '#7c3aed10' }
            }}>
            {showAllTasks ? 'Hide Tasks' : 'Show All Tasks'}
          </Button>
        </Box>

        <Collapse in={showAllTasks}>
          <Box sx={{ p: 3 }}>
            {/* Filter Tabs */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              {[
                { key: 'all', label: 'All', count: allTasks.length },
                { key: 'pending', label: 'Pending', count: allTasks.filter(t => t.status === 'pending').length },
                { key: 'completed', label: 'Completed', count: allTasks.filter(t => t.status === 'completed').length }
              ].map(tab => (
                <Button
                  key={tab.key}
                  size="small"
                  variant={taskFilter === tab.key ? 'contained' : 'outlined'}
                  onClick={() => setTaskFilter(tab.key)}
                  sx={{
                    bgcolor: taskFilter === tab.key ? '#7c3aed' : 'transparent',
                    borderColor: '#7c3aed',
                    color: taskFilter === tab.key ? '#fff' : '#7c3aed',
                    fontWeight: 700,
                    textTransform: 'none',
                    '&:hover': { bgcolor: taskFilter === tab.key ? '#6d28d9' : '#7c3aed10' }
                  }}>
                  {tab.label} ({tab.count})
                </Button>
              ))}
            </Box>

            {/* Tasks List */}
            {allTasks.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography sx={{ fontSize: 48, mb: 2 }}>📭</Typography>
                <Typography variant="h6" fontWeight={700} color="text.secondary">No tasks found</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {taskFilter === 'pending' ? 'No pending tasks' : taskFilter === 'completed' ? 'No completed tasks yet' : 'No tasks assigned yet'}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gap: 2 }}>
                {allTasks.map(task => {
                  const isPending = task.status === 'pending';
                  const isUrgent = task.priority === 'urgent' || task.isUrgent;
                  
                  return (
                    <Card key={task._id} sx={{ 
                      border: isUrgent ? '2px solid #d32f2f' : isPending ? '2px solid #7c3aed' : '2px solid #e0e0e0',
                      borderRadius: 2,
                      '&:hover': { boxShadow: '0 4px 12px rgba(124,58,237,0.2)' }
                    }}>
                      <CardContent sx={{ p: 2.5 }}>
                        {/* Header */}
                        <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                            <Avatar sx={{ bgcolor: '#7c3aed', width: 40, height: 40, fontSize: 14, fontWeight: 700 }}>
                              {initials(task.tlName)}
                            </Avatar>
                            <Box>
                              <Typography variant="body1" fontWeight={700} sx={{ color: '#1a1a1a' }}>
                                {task.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Assigned to {task.tlName} • {new Date(task.createdAt).toLocaleDateString('en-IN')}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {isUrgent && (
                              <Chip label="🔥 URGENT" size="small"
                                sx={{ bgcolor: '#fdecea', color: '#d32f2f', fontWeight: 800, fontSize: 10 }} />
                            )}
                            <Chip 
                              label={isPending ? 'PENDING' : '✓ COMPLETED'} 
                              size="small"
                              sx={{ 
                                bgcolor: isPending ? '#7c3aed' : '#e6f4ea',
                                color: isPending ? '#fff' : '#2e7d32',
                                fontWeight: 800,
                                fontSize: 10
                              }} 
                            />
                          </Box>
                        </Box>

                        {/* Instructions */}
                        <Box sx={{ bgcolor: '#f9f9f9', p: 1.5, borderRadius: 1.5, mb: 2 }}>
                          <Typography variant="caption" sx={{ color: '#666', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                            Instructions
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#1a1a1a', mt: 0.5, fontSize: 13 }}>
                            {task.instructions}
                          </Typography>
                        </Box>

                        {/* Deadline */}
                        {task.deadline && (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: '#fff8e1', px: 1.5, py: 0.5, borderRadius: 10, mb: 2 }}>
                            <Typography variant="caption" sx={{ color: '#e65100', fontWeight: 700, fontSize: 10 }}>
                              ⏰ Deadline: {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Typography>
                          </Box>
                        )}

                        {/* Completion Notes */}
                        {task.completionNotes && (
                          <Box sx={{ bgcolor: '#e6f4ea', p: 1.5, borderRadius: 1.5, border: '1px solid #a8d5b5' }}>
                            <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                              TL's Completion Notes
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#1a1a1a', mt: 0.5, fontStyle: 'italic', fontSize: 13 }}>
                              "{task.completionNotes}"
                            </Typography>
                            {task.completedAt && (
                              <Typography variant="caption" sx={{ color: '#666', mt: 0.5, display: 'block', fontSize: 10 }}>
                                Completed on {new Date(task.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Box>
        </Collapse>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 3 }} action={<Button size="small" onClick={load}>Retry</Button>}>{error}</Alert>}

      {loading ? (
        <Box>
          {/* Search bar skeleton */}
          <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 2, mb: 3 }} />
          {/* KPI cards skeleton */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} sx={{ borderRadius: 3 }}>
                <CardContent sx={{ py: 2 }}>
                  <Skeleton variant="text" width="40%" height={48} sx={{ mb: 0.5 }} />
                  <Skeleton variant="text" width="60%" height={20} />
                </CardContent>
              </Card>
            ))}
          </Box>
          {/* Verification KPI skeletons */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} sx={{ borderRadius: 3 }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Skeleton variant="text" width="50%" height={18} sx={{ mb: 0.5 }} />
                  <Skeleton variant="text" width="30%" height={36} />
                </CardContent>
              </Card>
            ))}
          </Box>
          {/* TL card skeletons */}
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} sx={{ mb: 2, borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Skeleton variant="circular" width={36} height={36} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="25%" height={22} />
                  <Skeleton variant="text" width="40%" height={16} />
                </Box>
                <Skeleton variant="rectangular" width={70} height={24} sx={{ borderRadius: 20, mr: 1 }} />
                <Skeleton variant="rectangular" width={70} height={24} sx={{ borderRadius: 20 }} />
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : filtered.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6, border: `1.5px dashed ${BRAND.primaryLight}` }}>
          <Typography color="text.secondary">No TLs found.</Typography>
        </Card>
      ) : (
        filtered.map((tlData, i) => (
          <TLCard key={tlData.tl._id || i} tlData={tlData} search={search} verifyMap={globalVerifyMap} onAssignTask={handleAssignTask} />
        ))
      )}

      {/* Admin Notifications Modal */}
      {notificationOpen && (
        <Dialog open onClose={() => setNotificationOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#7c3aed' }}>🔔 TL Task Notifications</Typography>
              <Typography variant="body2" color="text.secondary">
                {notificationCount} completed task{notificationCount !== 1 ? 's' : ''} from Team Leaders
              </Typography>
            </Box>
            <IconButton onClick={() => setNotificationOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0, maxHeight: 500 }}>
            {adminNotifications.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography sx={{ fontSize: 48, mb: 2 }}>📭</Typography>
                <Typography variant="h6" fontWeight={700} color="text.secondary">No new notifications</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  All tasks are up to date
                </Typography>
              </Box>
            ) : (
              <Box sx={{ p: 2 }}>
                {adminNotifications.map((task, index) => (
                  <Card key={task._id} sx={{ 
                    mb: 2, 
                    border: '2px solid #7c3aed20',
                    borderRadius: 2,
                    '&:hover': { boxShadow: '0 4px 12px rgba(124,58,237,0.2)' }
                  }}>
                    <CardContent sx={{ p: 2.5 }}>
                      {/* Header */}
                      <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                          <Avatar sx={{ bgcolor: '#7c3aed', width: 40, height: 40, fontSize: 14, fontWeight: 700 }}>
                            {initials(task.tlName)}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight={700} sx={{ color: '#1a1a1a' }}>
                              {task.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Completed by {task.tlName} • {new Date(task.completedAt).toLocaleString('en-IN')}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip 
                          label="✓ COMPLETED" 
                          size="small"
                          sx={{ 
                            bgcolor: '#e6f4ea', 
                            color: '#2e7d32', 
                            fontWeight: 800,
                            fontSize: 10
                          }} 
                        />
                      </Box>

                      {/* Original Instructions */}
                      <Box sx={{ bgcolor: '#f9f9f9', p: 1.5, borderRadius: 1.5, mb: 2 }}>
                        <Typography variant="caption" sx={{ color: '#666', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                          Original Task
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#1a1a1a', mt: 0.5, fontSize: 13 }}>
                          {task.instructions}
                        </Typography>
                      </Box>

                      {/* Completion Notes */}
                      {task.completionNotes && (
                        <Box sx={{ bgcolor: '#e6f4ea', p: 1.5, borderRadius: 1.5, border: '1px solid #a8d5b5', mb: 2 }}>
                          <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                            TL's Completion Notes
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#1a1a1a', mt: 0.5, fontStyle: 'italic', fontSize: 13 }}>
                            "{task.completionNotes}"
                          </Typography>
                        </Box>
                      )}

                      {/* Priority & Deadline */}
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        {task.priority === 'urgent' && (
                          <Chip 
                            label="🔥 URGENT" 
                            size="small"
                            sx={{ bgcolor: '#fdecea', color: '#d32f2f', fontWeight: 700, fontSize: 10 }} 
                          />
                        )}
                        {task.deadline && (
                          <Chip 
                            label={`⏰ Deadline: ${new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                            size="small"
                            sx={{ bgcolor: '#fff8e1', color: '#e65100', fontWeight: 600, fontSize: 10 }} 
                          />
                        )}
                      </Box>

                      {/* Mark as Read Button */}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1.5, borderTop: '1px solid #f0f0f0' }}>
                        <Button 
                          size="small"
                          variant="contained"
                          onClick={() => handleMarkAsRead(task._id)}
                          sx={{ 
                            bgcolor: '#7c3aed', 
                            fontWeight: 700,
                            fontSize: 12,
                            textTransform: 'none',
                            '&:hover': { bgcolor: '#6d28d9' }
                          }}>
                          ✓ Mark as Read
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setNotificationOpen(false)} variant="contained" sx={{ bgcolor: '#7c3aed', fontWeight: 700 }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Assign Task Modal */}
      {assignTaskOpen && selectedTL && (
        <Dialog open onClose={() => !submitting && setAssignTaskOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#7c3aed' }}>📋 Assign Task to TL</Typography>
              <Typography variant="body2" color="text.secondary">
                Assigning to: {selectedTL.name || selectedTL.email}
              </Typography>
            </Box>
            <IconButton onClick={() => !submitting && setAssignTaskOpen(false)} size="small" disabled={submitting}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                label="Task Title"
                placeholder="e.g., Review pending verifications"
                value={taskForm.title}
                onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                fullWidth
                required
                disabled={submitting}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                label="Instructions"
                placeholder="Detailed instructions for the TL..."
                value={taskForm.instructions}
                onChange={(e) => setTaskForm(prev => ({ ...prev, instructions: e.target.value }))}
                fullWidth
                required
                multiline
                rows={4}
                disabled={submitting}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  select
                  label="Priority"
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                  fullWidth
                  disabled={submitting}
                  SelectProps={{ native: true }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </TextField>
                <TextField
                  type="date"
                  label="Deadline"
                  value={taskForm.deadline}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, deadline: e.target.value }))}
                  fullWidth
                  disabled={submitting}
                  InputLabelProps={{ shrink: true }}
                  helperText={taskForm.priority === 'urgent' ? 'Required for urgent tasks' : 'Optional'}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
            <Button onClick={() => setAssignTaskOpen(false)} disabled={submitting} sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitTask}
              variant="contained"
              disabled={submitting}
              sx={{ bgcolor: '#7c3aed', fontWeight: 700, '&:hover': { bgcolor: '#6d28d9' } }}>
              {submitting ? 'Assigning...' : 'Assign Task'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Manual Verification Modal */}
      {manualVerifyOpen && selectedForm && (
        <Dialog open onClose={() => !verifyingManually && setManualVerifyOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ bgcolor: '#7c3aed', color: '#fff', fontWeight: 700 }}>
            Manual Verification
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                You are about to manually verify this form:
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Customer:</strong> {selectedForm.customerName}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Phone:</strong> {selectedForm.customerNumber}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Product:</strong> {selectedForm.formFillingFor || selectedForm.tideProduct || selectedForm.brand || '–'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Location:</strong> {selectedForm.location}
                </Typography>
                <Typography variant="body2">
                  <strong>FSE:</strong> {selectedForm.employeeName}
                </Typography>
              </Box>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason for Manual Verification (Optional)"
              placeholder="e.g., No automated rules available for this product, Verified through alternate channel, etc."
              value={verifyReason}
              onChange={(e) => setVerifyReason(e.target.value)}
              disabled={verifyingManually}
              sx={{ mt: 2 }}
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              This form will be marked as <strong>"Fully Verified"</strong> and will be visible across all panels (Admin, TL, Employee).
            </Alert>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
            <Button 
              onClick={() => setManualVerifyOpen(false)} 
              disabled={verifyingManually}
              sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitManualVerification}
              variant="contained"
              disabled={verifyingManually}
              sx={{ bgcolor: '#2e7d32', fontWeight: 700, '&:hover': { bgcolor: '#1b5e20' } }}>
              {verifyingManually ? 'Verifying...' : '✓ Verify Form'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Drill-down Modal */}
      {drillOpen && (
        <Dialog open onClose={() => { setDrillOpen(null); setDrillSearch(''); }} maxWidth="lg" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" component="span" fontWeight={800} sx={{ color: drillOpen.color }}>{drillOpen.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {drillSearch ? `${drillOpen.rows.filter(row => Object.values(row).some(v => String(v||'').toLowerCase().includes(drillSearch.toLowerCase()))).length} of ` : ''}{drillOpen.rows.length} records
              </Typography>
            </Box>
            <IconButton onClick={() => { setDrillOpen(null); setDrillSearch(''); }} size="small"><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f0f0f0' }}>
              <TextField size="small" fullWidth placeholder="Search..."
                value={drillSearch} onChange={e => setDrillSearch(e.target.value)}
                InputProps={{ startAdornment: <Box component="span" sx={{ mr: 1, color: 'text.secondary' }}>🔍</Box> }} />
            </Box>
            <TableContainer sx={{ maxHeight: 460 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: drillOpen.color, color: '#fff', width: 40 }}>#</TableCell>
                    {drillOpen.cols.map(c => <TableCell key={c} sx={{ fontWeight: 700, bgcolor: drillOpen.color, color: '#fff' }}>{c}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drillOpen.rows
                    .filter(row => !drillSearch || Object.values(row).some(v => String(v||'').toLowerCase().includes(drillSearch.toLowerCase())))
                    .map((row, i) => {
                    const colKeyMap = { 'Name': 'name', 'Email': 'email', 'Phone': 'phone', 'TL': 'tl', 'Status': 'status', 'Location': 'location', 'Manager': 'manager', 'Customer': 'customer', 'FSE': 'fse', 'Product': 'product', 'Date': 'date' };
                    return (
                      <TableRow key={i} hover sx={{ '&:nth-of-type(even)': { bgcolor: `${drillOpen.color}05` } }}>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{i + 1}</TableCell>
                        {drillOpen.cols.map(c => {
                          const val = row[colKeyMap[c]] ?? '–';
                          if (c === 'Status') {
                            const sColor = val === 'Ready for Onboarding' ? '#2e7d32' : val === 'Not Interested' ? '#c62828' : val === 'Try but not done due to error' ? '#e65100' : val === 'Active' || val === 'Working' ? '#2e7d32' : '#1565c0';
                            const sBg = val === 'Ready for Onboarding' ? '#e6f4ea' : val === 'Not Interested' ? '#fdecea' : val === 'Try but not done due to error' ? '#fff3e0' : val === 'Active' || val === 'Working' ? '#e6f4ea' : '#e3f2fd';
                            const sShort = val === 'Ready for Onboarding' ? 'Onboarding' : val === 'Not Interested' ? 'Not Int.' : val === 'Try but not done due to error' ? 'Try/Err' : val;
                            return <TableCell key={c}><Box component="span" sx={{ px: 1, py: 0.3, borderRadius: 10, fontSize: 11, fontWeight: 700, bgcolor: sBg, color: sColor }}>{sShort}</Box></TableCell>;
                          }
                          return <TableCell key={c} sx={{ fontSize: 12 }}>{val}</TableCell>;
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 1.5 }}>
            <Button onClick={() => { setDrillOpen(null); setDrillSearch(''); }} variant="contained" sx={{ bgcolor: drillOpen.color, fontWeight: 700 }}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
