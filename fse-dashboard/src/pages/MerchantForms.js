import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  Box, Typography, Card, CardContent, Button, Chip, CircularProgress,
  Alert, Tooltip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar, Tabs, Tab, Badge, TextField,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Collapse, Menu, MenuItem, ListItemIcon, ListItemText,
  Snackbar, Skeleton, Checkbox,
} from '@mui/material';
import RefreshIcon        from '@mui/icons-material/Refresh';
import SearchIcon         from '@mui/icons-material/Search';
import WarningAmberIcon   from '@mui/icons-material/WarningAmber';
import NotificationsIcon  from '@mui/icons-material/Notifications';
import ExpandMoreIcon     from '@mui/icons-material/ExpandMore';
import ExpandLessIcon     from '@mui/icons-material/ExpandLess';
import CloseIcon          from '@mui/icons-material/Close';
import DownloadIcon       from '@mui/icons-material/Download';
import TableChartIcon     from '@mui/icons-material/TableChart';
import GridOnIcon         from '@mui/icons-material/GridOn';
import EditIcon           from '@mui/icons-material/Edit';
import DeleteIcon         from '@mui/icons-material/Delete';
import * as XLSX          from 'xlsx';
import { BRAND }          from '../theme';

// ── Flatten a form record into a flat row for export ─────────
function flattenForm(f, empMap = {}, tlMap = {}, verifyMap = {}) {
  const emp = empMap[f.employeeName] || {};
  const tl  = tlMap[(emp.reportingManager || '').toLowerCase().trim()] || {};
  const product = f.formFillingFor || f.tideProduct || f.brand || (f.attemptedProducts || []).join(', ');
  const vKey = (f.formFillingFor || f.tideProduct || f.brand || '')
    ? `${f.customerNumber}__${(f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim()}`
    : f.customerNumber;
  const verification = verifyMap[vKey]?.status || 'Not Found';
  return {
    'Employee Name':   f.employeeName   || '',
    'Employee Email':  emp.newJoinerEmailId || '',
    'Employee Phone':  emp.newJoinerPhone   || '',
    'Team Leader':     emp.reportingManager  || '',
    'TL Phone':        tl.phone || '',
    'TL Email':        tl.email || '',
    'Customer Name':     f.customerName   || '',
    'Customer Phone':    f.customerNumber || '',
    'Location':          f.location       || '',
    'Visit Status':      f.status         || '',
    'Product':           product,
    'Verification Status': verification,
    'Tide QR Posted':    f.tide_qrPosted    || '',
    'Tide UPI Txn Done': f.tide_upiTxnDone  || '',
    // 'Kotak Txn Done':    f.kotak_txnDone    || '',
    // 'Kotak WiFi/BT Off': f.kotak_wifiBtOff  || '',
    'Insurance Vehicle No':   f.ins_vehicleNumber  || '',
    'Insurance Vehicle Type': f.ins_vehicleType    || '',
    'Insurance Type':         f.ins_insuranceType  || '',
    'PineLab Card Txn':       f.pine_cardTxn       || '',
    'PineLab WiFi Connected': f.pine_wifiConnected || '',
    'Credit Card Name':       f.cc_cardName        || '',
    'Tide Insurance Type':    f.tideIns_type        || '',
    // 'BharatPay Product':      f.bp_product          || '',
    'Submitted On':      f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
  };
}

// ── Export to Excel ───────────────────────────────────────────
  async function exportToExcel(forms) { 
  // Fetch employee details
  const [empRes, tlRes] = await Promise.all([
    fetch(`${EMP_API}/auth/all-employees`),
    fetch(`${EMP_API}/tl/approved-list`)
  ]);
  const empList = empRes.ok ? await empRes.json() : [];
  const tlList  = tlRes.ok  ? await tlRes.json()  : [];

  // Build lookup maps
  const empMap = {};
  empList.forEach(e => { empMap[e.newJoinerName] = e; });
  const tlMap = {};
  tlList.forEach(t => { tlMap[t.name.toLowerCase().trim()] = t; });

  // Fetch verification statuses
  const phones   = forms.map(f => f.customerNumber).join(',');
  const names    = forms.map(f => encodeURIComponent(f.customerName || '')).join(',');
  const products = forms.map(f => encodeURIComponent((f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim())).join(',');
  const months   = forms.map(f => encodeURIComponent(new Date(f.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' }))).join(',');
  let verifyMap = {};
  try {
    const vRes = await fetch(`${EMP_API}/verify/bulk-admin?phones=${encodeURIComponent(phones)}&names=${names}&products=${products}&months=${months}`);
    if (vRes.ok) verifyMap = await vRes.json();
  } catch { /* ignore */ }

  const rows = forms.map(f => flattenForm(f, empMap, tlMap, verifyMap));
  const ws   = XLSX.utils.json_to_sheet(rows);

  // Auto column widths
  const colWidths = Object.keys(rows[0] || {}).map(key => ({
    wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length), 10)
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Merchant Forms');
  XLSX.writeFile(wb, `Merchant_Forms_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ── Export to Google Sheets ───────────────────────────────────
async function exportToGoogleSheets(forms, setExporting, setError) {
  setExporting(true);
  try {
    const rows    = forms.map(flattenForm);
    const headers = Object.keys(rows[0] || {});
    const values  = [headers, ...rows.map(r => headers.map(h => r[h] || ''))];

    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
      callback: async (tokenResponse) => {
        try {
          if (tokenResponse.error) {
            setError('Google auth failed: ' + tokenResponse.error);
            setExporting(false);
            return;
          }
          const accessToken = tokenResponse.access_token;

          // Create new spreadsheet
          const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              properties: { title: `Merchant Forms ${new Date().toLocaleDateString('en-IN')}` },
              sheets: [{ properties: { title: 'Merchant Forms' } }]
            })
          });
          const sheet   = await createRes.json();
          const sheetId = sheet.spreadsheetId;
          if (!sheetId) throw new Error('Failed to create spreadsheet');

          // Write data
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1?valueInputOption=RAW`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values })
          });

          // Format: bold header, freeze row, auto-resize
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests: [
              { repeatCell: {
                  range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
                  cell: { userEnteredFormat: {
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                    backgroundColor: { red: 0.1, green: 0.27, blue: 0.15 }
                  }},
                  fields: 'userEnteredFormat(textFormat,backgroundColor)'
              }},
              { updateSheetProperties: {
                  properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
                  fields: 'gridProperties.frozenRowCount'
              }},
              { autoResizeDimensions: {
                  dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: headers.length }
              }}
            ]})
          });

          window.open(`https://docs.google.com/spreadsheets/d/${sheetId}`, '_blank');
        } catch (err) {
          setError('Export failed: ' + err.message);
        } finally {
          setExporting(false);
        }
      }
    });

    if (!tokenClient) {
      setError('Google API not loaded yet. Please wait a moment and try again.');
      setExporting(false);
      return;
    }
    tokenClient.requestAccessToken();
  } catch (err) {
    setError('Export failed: ' + err.message);
    setExporting(false);
  }
}

// ── Points calculation (client-side, mirrors backend POINTS_MAP) ─
const POINTS_MAP = { 
  'Tide': 2, 
  'Tide MSME': 0.3, 
  'MSME': 0.3,           // keep for old records
  'Tide Insurance': 1, 
  'Tide Credit Card': 1 
};


function calcAutoPoints(forms, verifiedPhones) {
  return forms.reduce((sum, f) => {
    if (verifiedPhones.has(f.customerNumber)) sum += POINTS_MAP[f.tideProduct] || POINTS_MAP[f.formFillingFor] || 0;

    return sum;
  }, 0);
}

const EMP_API = process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api';

function initials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const PRODUCT_COLORS = {
  'Tide':                { bg: '#e3f2fd', color: '#1565c0' },
  'Kotak 811':           { bg: '#f3e5f5', color: '#6a1b9a' },
  'Insurance':           { bg: '#fff3e0', color: '#e65100' },
  'PineLab':             { bg: '#e8f5e9', color: '#2e7d32' },
  'Credit Card':         { bg: '#fce4ec', color: '#880e4f' },
  'Tide Insurance':      { bg: '#e0f7fa', color: '#006064' },
  'MSME':                { bg: '#f9fbe7', color: '#558b2f' },
  'Airtel Payments Bank':{ bg: '#fbe9e7', color: '#bf360c' },
  'Equitas SF Bank':     { bg: '#ede7f6', color: '#4527a0' },
  'IndusInd Bank':       { bg: '#e8eaf6', color: '#283593' },
  'Bharat Pay':          { bg: '#e0f2f1', color: '#004d40' },
  'Tide Credit Card':    { bg: '#e1f5fe', color: '#01579b' },
};

function ProductChip({ product }) {
  const c = PRODUCT_COLORS[product] || { bg: '#f5f5f5', color: '#555' };
  return (
    <Chip label={product || '–'} size="small"
      sx={{ bgcolor: c.bg, color: c.color, fontWeight: 700, fontSize: 11, border: `1px solid ${c.color}30` }} />
  );
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

// ── Duplicate Alert Panel ─────────────────────────────────────
function DuplicatePanel({ duplicates, open, onClose, onNotify, notifying, onSettle, settling, forms, onEmployeeClick }) {
  const [tab, setTab]               = useState('active');
  const [settlements, setSettlements] = useState([]);
  const [loadingSett, setLoadingSett] = useState(false);
  const [settleNote, setSettleNote]   = useState({});

  const loadSettlements = useCallback(async () => {
    setLoadingSett(true);
    try {
      const res  = await fetch(`${EMP_API}/forms/admin/settlements`);
      setSettlements(res.ok ? await res.json() : []);
    } catch { /* ignore */ } finally { setLoadingSett(false); }
  }, []);

  useEffect(() => { if (open && tab === 'settled') loadSettlements(); }, [open, tab, loadSettlements]);
  // Reload settlements after a new settle action
  useEffect(() => { if (open && settling === null && tab === 'settled') loadSettlements(); }, [settling]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#c62828', fontWeight: 800, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon /> Cross-Employee Duplicate Merchants
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 40,
          '& .MuiTab-root': { fontWeight: 700, fontSize: 12, minHeight: 40 },
          '& .MuiTabs-indicator': { bgcolor: BRAND.primary } }}>
          <Tab value="active"  label={`Active (${duplicates.filter(d => !d.settled).length}) · Settled (${duplicates.filter(d => d.settled).length})`} />
          <Tab value="settled" label="Settled History" onClick={loadSettlements} />
        </Tabs>
      </Box>

      <DialogContent dividers sx={{ p: 2 }}>
        {/* ── Active duplicates ── */}
        {tab === 'active' && (
          duplicates.length === 0
            ? <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No active cross-employee duplicates.</Typography>
            : duplicates.map((dup, i) => (
              <Card key={i} sx={{ mb: 2, border: `1.5px solid ${dup.settled ? '#a5d6a7' : '#ffcdd2'}`, borderRadius: 2,
                bgcolor: dup.settled ? '#f9fffe' : 'background.paper' }}>
                <CardContent sx={{ pb: '12px !important' }}>
                  {/* Header row */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      {dup.settled
                        ? <Chip label="✓ Settled" size="small" sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700 }} />
                        : <WarningAmberIcon sx={{ color: '#c62828', fontSize: 18 }} />
                      }
                      <Typography fontWeight={800} sx={{ color: dup.settled ? '#2e7d32' : '#c62828' }}>
                        {dup.customerNames[0] || dup._id.customerNumber}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">({dup._id.customerNumber})</Typography>
                      <ProductChip product={dup._id.formFillingFor} />
                      <Chip label={`${dup.count} submissions`} size="small" sx={{ bgcolor: '#fdecea', color: '#c62828', fontWeight: 700 }} />
                    </Box>
                    {/* Action buttons — hide if already settled */}
                    {!dup.settled && (
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Tooltip title="Send duplicate alert notification to both employees">
                          <Button size="small" variant="outlined"
                            disabled={notifying === i}
                            startIcon={notifying === i ? <CircularProgress size={12} /> : <NotificationsIcon />}
                            onClick={() => onNotify(dup, i)}
                            sx={{ color: '#c62828', borderColor: '#c62828', fontWeight: 700, fontSize: 11,
                              '&:hover': { bgcolor: '#fdecea' } }}>
                            {notifying === i ? 'Notifying…' : 'Notify'}
                          </Button>
                        </Tooltip>
                        <Tooltip title="Mark this duplicate as settled — record is kept for history">
                          <Button size="small" variant="contained"
                            disabled={settling === i}
                            startIcon={settling === i ? <CircularProgress size={12} sx={{ color: 'inherit' }} /> : null}
                            onClick={() => onSettle(dup, i, settleNote[i] || '')}
                            sx={{ bgcolor: BRAND.primary, fontWeight: 700, fontSize: 11,
                              '&:hover': { bgcolor: '#0f3320' } }}>
                            {settling === i ? 'Settling…' : '✓ Mark Settled'}
                          </Button>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Customer names used: {dup.customerNames.join(', ')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: dup.settled ? 0 : 1.5 }}>
                    {dup.employees.map((emp, j) => (
                      <Chip 
                        key={j} 
                        avatar={<Avatar sx={{ bgcolor: dup.settled ? '#888' : BRAND.primary, fontSize: 11 }}>{initials(emp)}</Avatar>}
                        label={emp} 
                        size="small" 
                        onClick={() => {
                          // Find the form submitted by this employee for this duplicate
                          const empForm = forms.find(f => 
                            f.employeeName === emp && 
                            f.customerNumber === dup._id.customerNumber &&
                            (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase() === (dup._id.formFillingFor || '').toLowerCase()
                          );
                          if (empForm) {
                            onEmployeeClick({ employeeName: emp, form: empForm, duplicate: dup });
                          }
                        }}
                        sx={{ 
                          fontWeight: 600, 
                          cursor: 'pointer',
                          '&:hover': { bgcolor: '#e3f2fd', transform: 'scale(1.05)' },
                          transition: 'all 0.2s'
                        }} 
                      />
                    ))}
                  </Box>
                  {/* Settlement info */}
                  {dup.settled && dup.settlementInfo && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Settled on {new Date(dup.settlementInfo.settledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {dup.settlementInfo.note ? ` · ${dup.settlementInfo.note}` : ''}
                    </Typography>
                  )}
                  {/* Note field — only for unsettled */}
                  {!dup.settled && (
                    <TextField size="small" fullWidth placeholder="Add settlement note (optional)…"
                      value={settleNote[i] || ''}
                      onChange={e => setSettleNote(prev => ({ ...prev, [i]: e.target.value }))}
                      sx={{ '& .MuiOutlinedInput-root': { fontSize: 12 } }} />
                  )}
                </CardContent>
              </Card>
            ))
        )}

        {/* ── Settled history ── */}
        {tab === 'settled' && (
          loadingSett
            ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} sx={{ color: BRAND.primary }} /></Box>
            : settlements.length === 0
              ? <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No settled duplicates yet.</Typography>
              : settlements.map((s, i) => (
                <Card key={i} sx={{ mb: 2, border: `1.5px solid ${BRAND.primaryLight || '#c8e6c9'}`, borderRadius: 2 }}>
                  <CardContent sx={{ pb: '12px !important' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      <Chip label="✓ Settled" size="small" sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700 }} />
                      <Typography fontWeight={700} sx={{ color: 'text.primary' }}>{s.customerName || s.customerNumber}</Typography>
                      <Typography variant="caption" color="text.secondary">({s.customerNumber})</Typography>
                      <ProductChip product={s.product} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      {(s.employees || []).map((emp, j) => (
                        <Chip key={j} avatar={<Avatar sx={{ bgcolor: '#888', fontSize: 11 }}>{initials(emp)}</Avatar>}
                          label={emp} size="small" sx={{ fontWeight: 600 }} />
                      ))}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Settled on {new Date(s.settledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {s.note ? ` · Note: ${s.note}` : ''}
                    </Typography>
                  </CardContent>
                </Card>
              ))
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: BRAND.primary, fontWeight: 700 }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Verification status chip ──────────────────────────────────
function VerifyChip({ status, onClick }) {
  const map = {
    'Fully Verified': { bg: '#e6f4ea', color: '#2e7d32', icon: '✓' },
    'Partially Done': { bg: '#fff8e1', color: '#f57f17', icon: '◑' },
    'Not Verified':   { bg: '#fdecea', color: '#c62828', icon: '✗' },
    'Not Found':      { bg: '#f5f5f5', color: '#888',    icon: '–' },
  };
  const s = map[status] || map['Not Found'];
  return (
    <Chip
      label={`${s.icon} ${status || 'Not Found'}`}
      size="small"
      onClick={onClick}
      sx={{
        bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11,
        border: `1px solid ${s.color}30`,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { opacity: 0.85, transform: 'scale(1.04)' } : {},
        transition: 'all 0.15s',
      }}
    />
  );
}

// ── Employee Group Row ────────────────────────────────────────
function EmployeeGroup({ empName, forms, duplicatePhones, empPointsData, onEditPoints, onManualVerify, onRevertVerification, onReload, globalVerifyMap: parentVerifyMap }) {

  const getProduct = (f) =>
    (f?.tideProduct || f?.formFillingFor || f?.brand || '').toLowerCase().trim();

  const getKey = (f) => {
    const p = getProduct(f);
    return p ? `${f.customerNumber}__${p}` : f.customerNumber;
  };

  const [expanded, setExpanded] = useState(false);
  const [localVerifyMap, setLocalVerifyMap] = useState({});
  const [verifying, setVerifying] = useState(false);
  const [verifyDetail, setVerifyDetail] = useState(null);
  const [verifyDetailLoading, setVerifyDetailLoading] = useState(false);
  const [editForm, setEditForm]   = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editSnack, setEditSnack]   = useState('');

  // Use parent globalVerifyMap if available, otherwise fall back to local fetch
  const verifyMap = Object.keys(parentVerifyMap || {}).length > 0 ? (parentVerifyMap || {}) : localVerifyMap;

  const dupCount = forms.filter(f => duplicatePhones.has(f.customerNumber)).length;

  const fetchVerification = useCallback(async () => {
    // Skip if parent already has data
    if (Object.keys(parentVerifyMap || {}).length > 0) return;
    if (verifying || Object.keys(localVerifyMap).length > 0) return;
    setVerifying(true);
    try {
      const phones   = forms.map(f => f.customerNumber).join(',');
      const names    = forms.map(f => encodeURIComponent(f.customerName)).join(',');
      const products = forms.map(f => encodeURIComponent(getProduct(f))).join(',');
      const months   = forms.map(f =>
        encodeURIComponent(new Date(f.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' }))
      ).join(',');
      const res = await fetch(
        `${EMP_API}/verify/bulk-admin?phones=${encodeURIComponent(phones)}&names=${names}&products=${products}&months=${months}`
      );
      if (res.ok) setLocalVerifyMap(await res.json());
    } catch (err) {
      console.error("Verification error:", err);
    } finally {
      setVerifying(false);
    }
  }, [forms, localVerifyMap, verifying, parentVerifyMap]);

  // Only auto-fetch if parent doesn't have data
  useEffect(() => {
    if (forms.length > 0 && Object.keys(parentVerifyMap || {}).length === 0) fetchVerification();
  }, [forms.length]); // eslint-disable-line

  // ✅ FIXED: safe points calculation — deduplicate by customerNumber+product
  // so same merchant submitted multiple times only counts once per product
  const autoPoints = (() => {
    const counted = new Set(); // track customerNumber__product already counted
    let sum = 0;
    Object.keys(verifyMap).forEach(key => {
      if (verifyMap[key]?.status === 'Fully Verified') {
        const form = forms.find(f => getKey(f) === key);
        if (!form) return;
        const product  = getProduct(form); // lowercase
        const dedupKey = `${form.customerNumber}__${product}`;
        if (counted.has(dedupKey)) return; // already counted this merchant+product
        counted.add(dedupKey);
        const pointsKey = Object.keys(POINTS_MAP).find(k => k.toLowerCase().trim() === product);
        sum += pointsKey ? POINTS_MAP[pointsKey] : 0;
      }
    });
    return Math.round(sum * 10) / 10;
  })();

  const adjustment  = empPointsData?.pointsAdjustment || 0;
  // Only fall back to saved verifiedPoints if verifyMap hasn't been loaded yet
  const verified    = Object.keys(verifyMap).length > 0 ? autoPoints : (empPointsData?.verifiedPoints || 0);
  const totalPoints = Math.round((verified + adjustment) * 10) / 10;

  const handleSaveEdit = async () => {
    if (!editForm?._id) return;
    setEditSaving(true);
    try {
      const res = await fetch(`${EMP_API}/forms/admin/update/${editForm._id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          customerName:   editForm.customerName,
          customerNumber: editForm.customerNumber,
          location:       editForm.location,
          status:         editForm.status,
          formFillingFor: editForm.formFillingFor,
          reason:         editForm._editReason || '',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditSnack('✓ Form updated successfully');
        setEditForm(null);
        // Reset local verifyMap so verification re-runs with new data
        setLocalVerifyMap({});
        onReload();
      } else {
        setEditSnack(`Error: ${data.message}`);
      }
    } catch {
      setEditSnack('Failed to update. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteForm = async (f) => {
    if (!window.confirm(`Delete form for "${f.customerName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${EMP_API}/forms/admin/delete/${f._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setEditSnack('✓ Form deleted successfully');
        setLocalVerifyMap({});
        onReload();
      } else {
        setEditSnack(`Error: ${data.message}`);
        console.error('Delete failed:', data);
      }
    } catch (err) {
      setEditSnack(`Failed to delete: ${err.message}`);
      console.error('Delete error:', err);
    }
  };

  const openVerifyDetail = async (f) => {
    setVerifyDetail({ form: f, loading: true, data: null });
    setVerifyDetailLoading(true);
    try {
      const product = getProduct(f);
      const month   = f.createdAt
        ? new Date(f.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' })
        : '';
      const res = await fetch(
        `${EMP_API}/verify/check-admin?phone=${encodeURIComponent(f.customerNumber)}&name=${encodeURIComponent(f.customerName || '')}&product=${encodeURIComponent(product)}&month=${encodeURIComponent(month)}`
      );
      const data = res.ok ? await res.json() : null;
      setVerifyDetail({ form: f, loading: false, data });
    } catch {
      setVerifyDetail({ form: f, loading: false, data: null });
    } finally {
      setVerifyDetailLoading(false);
    }
  };

  return (
    <Card sx={{ mb: 2, border: `1.5px solid ${BRAND.primaryLight || '#c8e6c9'}`, borderRadius: 2 }}>

      {/* HEADER */}
      <Box
        onClick={() => {
          const next = !expanded;
          setExpanded(next);
          if (next) fetchVerification();
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          px: 2.5,
          py: 1.5,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
          borderRadius: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: BRAND.primary }}>{initials(empName)}</Avatar>

          <Box>
            <Typography fontWeight={700}>{empName}</Typography>
            <Typography variant="caption">{forms.length} merchants</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            label={`⭐ ${totalPoints}`}
            onClick={e => {
              e.stopPropagation();
              // Build per-product verified breakdown
              const productBreakdown = {};
              Object.keys(verifyMap).forEach(key => {
                if (verifyMap[key]?.status === 'Fully Verified') {
                  const form = forms.find(f => getKey(f) === key);
                  if (!form) return;
                  const rawProduct = form.tideProduct || form.formFillingFor || form.brand || 'Other';
                  const product = rawProduct.toLowerCase() === 'msme' ? 'Tide MSME' : rawProduct;
                  if (!productBreakdown[product]) productBreakdown[product] = 0;
                  productBreakdown[product]++;
                }
              });
              onEditPoints(empName, empPointsData, autoPoints, productBreakdown);
            }}
            sx={{ cursor: 'pointer', fontWeight: 700 }}
          />

          {dupCount > 0 && (
            <Chip label={`${dupCount} dup`} color="error" />
          )}

          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
      </Box>

      {/* TABLE */}
      <Collapse in={expanded}>
        <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableBody>
            {forms.map(f => {
              const isDup = duplicatePhones.has(f.customerNumber);
              const date  = f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–';

              return (
                <TableRow key={f._id} hover>

                  <TableCell>{f.customerName}</TableCell>
                  <TableCell>{f.customerNumber}</TableCell>

                  <TableCell>
                    <ProductChip product={getProduct(f)} />
                  </TableCell>

                  <TableCell>
                    {verifying
                      ? <CircularProgress size={12} />
                      : <VerifyChip
                          status={verifyMap[getKey(f)]?.status}
                          onClick={() => openVerifyDetail(f)}
                        />
                    }
                  </TableCell>

                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{date}</Typography>
                  </TableCell>

                  <TableCell>
                    {isDup && <WarningAmberIcon color="error" />}
                  </TableCell>

                  {/* Edit + Delete */}
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Edit form">
                        <IconButton size="small"
                          onClick={() => setEditForm({ ...f })}
                          sx={{ color: BRAND.primary, '&:hover': { bgcolor: '#e6f4ea' } }}>
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete form">
                        <IconButton size="small"
                          onClick={() => handleDeleteForm(f)}
                          sx={{ color: '#c62828', '&:hover': { bgcolor: '#fdecea' } }}>
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>

                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </Box>
      </Collapse>

      {/* ── Edit Form Modal ───────────────────────────────────── */}
      {editForm && (
        <Dialog open={!!editForm} onClose={() => setEditForm(null)} maxWidth="sm" fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}>
          <Box sx={{ background: `linear-gradient(135deg, ${BRAND.primary}dd, ${BRAND.primary}88)`, px: 3, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, letterSpacing: 1.5 }}>EDIT FORM</Typography>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800 }}>{editForm.customerName}</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>FSE: {editForm.employeeName}</Typography>
            </Box>
            <IconButton onClick={() => setEditForm(null)} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <DialogContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField fullWidth size="small" label="Customer Name"
                value={editForm.customerName || ''}
                onChange={e => setEditForm(p => ({ ...p, customerName: e.target.value }))} />

              <TextField fullWidth size="small" label="Customer Phone"
                value={editForm.customerNumber || ''}
                onChange={e => setEditForm(p => ({ ...p, customerNumber: e.target.value }))} />

              <TextField fullWidth size="small" label="Location"
                value={editForm.location || ''}
                onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} />

              <TextField fullWidth size="small" label="Product (formFillingFor)"
                value={editForm.formFillingFor || ''}
                onChange={e => setEditForm(p => ({ ...p, formFillingFor: e.target.value }))} />

              <TextField fullWidth size="small" label="Visit Status" select
                value={editForm.status || ''}
                onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                {['Ready for Onboarding', 'Not Interested', 'Try but not done due to error', 'Need to visit again'].map(s => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>

              <TextField fullWidth size="small" multiline rows={2}
                label="Reason for edit (FSE will be notified)"
                value={editForm._editReason || ''}
                onChange={e => setEditForm(p => ({ ...p, _editReason: e.target.value }))}
                placeholder="e.g. Corrected phone number, updated status" />
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              {(() => {
                const vKey = getKey(editForm);
                const vStatus = verifyMap[vKey]?.status || 'Not Found';
                const isFullyVerified = vStatus === 'Fully Verified';
                
                return isFullyVerified ? (
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => {
                      // Revert verification logic - will be passed from parent
                      if (window.confirm(`Revert verification for ${editForm.customerName}?\n\nThis will change status back to "Not Found".`)) {
                        // Call revert handler from parent
                        onRevertVerification(editForm);
                        setEditForm(null);
                      }
                    }}
                    sx={{ 
                      color: '#c62828', 
                      borderColor: '#c62828', 
                      fontWeight: 700,
                      '&:hover': { bgcolor: '#fdecea', borderColor: '#c62828' }
                    }}
                  >
                    ↺ Revert Verification
                  </Button>
                ) : (
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => {
                      onManualVerify(editForm);
                      setEditForm(null); // Close edit modal when opening verify modal
                    }}
                    sx={{ 
                      color: '#2e7d32', 
                      borderColor: '#2e7d32', 
                      fontWeight: 700,
                      '&:hover': { bgcolor: '#e6f4ea', borderColor: '#2e7d32' }
                    }}
                  >
                    ✓ Verify Form
                  </Button>
                );
              })()}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button onClick={() => setEditForm(null)} color="inherit">Cancel</Button>
              <Button variant="contained" onClick={handleSaveEdit} disabled={editSaving}
                startIcon={editSaving ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : null}
                sx={{ bgcolor: BRAND.primary, fontWeight: 700, '&:hover': { bgcolor: '#0f3320' } }}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </Button>
            </Box>
          </DialogActions>
        </Dialog>
      )}

      {/* Edit/Delete Snackbar */}
      <Snackbar open={!!editSnack} autoHideDuration={3000} onClose={() => setEditSnack('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={editSnack.startsWith('✓') ? 'success' : 'error'} variant="filled"
          onClose={() => setEditSnack('')}>
          {editSnack}
        </Alert>
      </Snackbar>

      {/* ── Verification Detail Modal ─────────────────────────── */}
      {verifyDetail && (() => {
        const f   = verifyDetail.form;
        const v   = verifyDetail.data?.verification || {};
        const pc  = verifyDetail.data?.phoneCheck   || {};
        const STATUS_COLORS = {
          'Fully Verified': { bg: '#e6f4ea', color: '#2e7d32', icon: '✓' },
          'Partially Done': { bg: '#fff8e1', color: '#f57f17', icon: '◑' },
          'Not Verified':   { bg: '#fdecea', color: '#c62828', icon: '✗' },
          'Not Found':      { bg: '#f5f5f5', color: '#888',    icon: '–' },
        };
        const vb = STATUS_COLORS[v.status] || STATUS_COLORS['Not Found'];

        return (
          <Dialog
            open={!!verifyDetail}
            onClose={() => setVerifyDetail(null)}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
          >
            {/* Colored header */}
            <Box sx={{
              background: `linear-gradient(135deg, ${vb.color}dd, ${vb.color}88)`,
              px: 3, py: 2.5,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'
            }}>
              <Box>
                <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, letterSpacing: 1.5 }}>
                  VERIFICATION DETAIL
                </Typography>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mt: 0.3 }}>
                  {f.customerName}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>
                    {f.customerNumber}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                    {getProduct(f) || '–'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                    FSE: {f.employeeName || '–'}
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={() => setVerifyDetail(null)}
                sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            <DialogContent sx={{ p: 3 }}>
              {verifyDetail.loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
                  <CircularProgress sx={{ color: vb.color }} />
                  <Typography variant="body2" color="text.secondary">Loading verification details…</Typography>
                </Box>
              ) : !verifyDetail.data ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">Could not load verification data.</Typography>
                  <Typography variant="caption" color="text.secondary">Make sure the employee server is running on port 4000.</Typography>
                </Box>
              ) : (
                <Box>
                  {/* Overall status badge */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, p: 2, borderRadius: 2, bgcolor: vb.bg, border: `1.5px solid ${vb.color}30` }}>
                    <Typography variant="h4" sx={{ color: vb.color }}>{vb.icon}</Typography>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={800} sx={{ color: vb.color }}>
                        {v.status || 'Not Found'}
                      </Typography>
                      {v.passed !== undefined && (
                        <Typography variant="caption" color="text.secondary">
                          {v.passed} of {v.total} conditions passed
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Condition chips summary */}
                  {(v.checks || []).length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, fontSize: 10 }}>
                        Condition Summary
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {v.checks.map((c, i) => (
                          <Box key={i} sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.5,
                            px: 1.5, py: 0.5, borderRadius: 20, fontSize: 12, fontWeight: 700,
                            bgcolor: c.pass ? '#e6f4ea' : '#fdecea',
                            color: c.pass ? '#2e7d32' : '#c62828',
                            border: `1.5px solid ${c.pass ? '#a8d5b5' : '#f5a5a5'}`,
                          }}>
                            {c.pass ? '✓' : '✗'} {c.label}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Detailed condition rows */}
                  {(v.checks || []).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1, fontSize: 10 }}>
                        Condition Details
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {v.checks.map((c, i) => (
                          <Box key={i} sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            p: 1.5, borderRadius: 2,
                            bgcolor: c.pass ? '#f0fdf4' : '#fff5f5',
                            border: `1px solid ${c.pass ? '#bbf7d0' : '#fecaca'}`,
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{
                                width: 24, height: 24, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                bgcolor: c.pass ? '#2e7d32' : '#c62828',
                                color: '#fff', fontSize: 12, fontWeight: 800, flexShrink: 0,
                              }}>
                                {c.pass ? '✓' : '✗'}
                              </Box>
                              <Typography variant="body2" fontWeight={700} sx={{ color: c.pass ? '#2e7d32' : '#c62828' }}>
                                {c.label}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="caption" color="text.secondary">
                                Actual value:
                              </Typography>
                              <Typography variant="body2" fontWeight={700} sx={{
                                color: c.pass ? '#2e7d32' : '#c62828',
                                fontFamily: 'monospace', fontSize: 12,
                              }}>
                                {c.actual || '–'}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Not Found case */}
                  {(v.checks || []).length === 0 && v.status === 'Not Found' && (
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Merchant not found in the verification collection.
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Phone: {f.customerNumber} · Product: {getProduct(f) || '–'}
                      </Typography>
                    </Box>
                  )}

                  {/* Phone match info */}
                  <Box sx={{
                    mt: 2, p: 1.5, borderRadius: 2,
                    bgcolor: pc.matched ? '#f0fdf4' : '#f9f9f9',
                    border: `1px solid ${pc.matched ? '#bbf7d0' : '#e0e0e0'}`,
                    display: 'flex', alignItems: 'center', gap: 1
                  }}>
                    <Typography variant="caption" fontWeight={700} sx={{ color: pc.matched ? '#2e7d32' : '#888' }}>
                      {pc.matched ? '✓ Found in collection' : '– Not found in collection'}
                    </Typography>
                    {v.collection && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        · {v.collection}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                {f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
              </Typography>
              <Button onClick={() => setVerifyDetail(null)} variant="contained"
                sx={{ bgcolor: vb.color, fontWeight: 700, borderRadius: 2, '&:hover': { opacity: 0.9 } }}>
                Close
              </Button>
            </DialogActions>
          </Dialog>
        );
      })()}

    </Card>
  );
}

// ── Edit Points Dialog (isolated component to prevent parent re-renders on typing) ──
function EditPointsDialog({ open, empData, onClose, onSave, adjHistory, onDeleteAdj, EMP_API, BRAND, POINTS_MAP }) {
  const [localValue,        setLocalValue]        = React.useState('0');
  const [localReason,       setLocalReason]        = React.useState('');
  const [localProductAdj,   setLocalProductAdj]    = React.useState({});
  const [localSlabs,        setLocalSlabs]         = React.useState({}); // { product: [{minForms, multiplier}] }
  const [manualDelta,       setManualDelta]        = React.useState('');
  const [manualReason,      setManualReason]       = React.useState('');
  const [saving,            setSaving]             = React.useState(false);
  const [deleteDialog,      setDeleteDialog]       = React.useState(null);
  const [deleteReason,      setDeleteReason]       = React.useState('');
  const [deleteSaving,      setDeleteSaving]       = React.useState(false);

  // Sync when dialog opens
  React.useEffect(() => {
    if (open && empData) {
      setLocalValue('0');
      setLocalReason('');
      setManualDelta('');
      setManualReason('');
      const initAdj = {};
      const initSlabs = {};
      Object.keys(empData.productBreakdown || {}).forEach(p => {
        initAdj[p] = { value: '0', reason: '' };
        initSlabs[p] = []; // empty slabs — admin adds
      });
      setLocalProductAdj(initAdj);
      setLocalSlabs(initSlabs);
    }
  }, [open, empData]);

  if (!open || !empData) return null;

  const { empName, empData: eData, autoPoints, productBreakdown } = empData;

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      empData: eData,
      empName,
      autoPoints,
      editPtsValue: localValue,
      editPtsReason: localReason,
      productAdjustments: localProductAdj,
      productSlabs: localSlabs,
      manualDelta,
      manualReason,
    });
    setSaving(false);
  };

  const handleClose = () => {
    setDeleteDialog(null);
    setDeleteReason('');
    onClose();
  };

  const productDelta = Object.entries(productBreakdown || {}).reduce((sum, [product, count]) => {
    const pts = POINTS_MAP[product] || 0;
    const slabs = (localSlabs[product] || []).filter(s => s.minForms !== '' && s.multiplier !== '');
    if (!slabs.length) return sum;
    // ALL qualifying slabs add up (cumulative)
    const totalBonus = slabs
      .filter(s => count >= Number(s.minForms))
      .reduce((s2, slab) => {
        const mul = parseFloat(slab.multiplier);
        return isNaN(mul) ? s2 : s2 + Math.round(count * pts * mul * 10000) / 10000;
      }, 0);
    return sum + totalBonus;
  }, 0);
  const overallDelta = 0;
  const manualCorrectionDelta = parseFloat(manualDelta) || 0;
  const existingAdj  = empData?.empData?.pointsAdjustment || 0;
  const newTotal = Math.round(((autoPoints || 0) + existingAdj + overallDelta + productDelta + manualCorrectionDelta) * 10) / 10;

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: BRAND.primary, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>⭐ Edit Points — {empName}</span>
          <IconButton size="small" onClick={handleClose}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#fff8e1', borderRadius: 2, border: '1px solid #f4a261' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Points criteria (Fully Verified only):</Typography>
            {[['Tide', 2], ['Tide MSME', 0.3], ['MSME', 0.3], ['Tide Insurance', 1], ['Tide Credit Card', 1]].map(([k, v]) => (
              <Typography key={k} variant="caption" sx={{ display: 'block', color: '#e76f51', fontWeight: 600 }}>{k}: {v} pts</Typography>
            ))}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Verified points (Fully Verified only): <strong style={{ color: '#e76f51' }}>{autoPoints || 0}</strong>
          </Typography>

          {/* Per-product adjustments */}
          {productBreakdown && Object.keys(productBreakdown).length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                Fully Verified by Product — adjust individually:
              </Typography>
              {Object.entries(productBreakdown).sort((a, b) => b[1] - a[1]).map(([product, count]) => {
                const pts = POINTS_MAP[product] || 0;
                const basePoints = Math.round(count * pts * 10000) / 10000;
                const slabs = localSlabs[product] || [];
                const reason = (localProductAdj[product] || {}).reason || '';

                // All qualifying slabs
                const qualifyingSlabs = slabs.map((slab, idx) => {
                  const qualifies = slab.minForms !== '' && count >= Number(slab.minForms);
                  const mul = parseFloat(slab.multiplier);
                  const result = qualifies && !isNaN(mul) ? Math.round(count * pts * mul * 10000) / 10000 : null;
                  return { ...slab, idx, qualifies, result };
                });
                const totalBonus = qualifyingSlabs.reduce((s, sl) => s + (sl.result || 0), 0);
                const roundedTotal = Math.round(totalBonus * 10000) / 10000;

                return (
                  <Box key={product} sx={{ mb: 2, p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: `1.5px solid ${totalBonus > 0 ? '#7c3aed' : '#bbf7d0'}` }}>
                    {/* Product header — only verified count + base pts */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#065f46' }}>{product}</Typography>
                      <Typography variant="body2" sx={{ color: '#059669', fontWeight: 700 }}>
                        {count} verified cases — {basePoints} pts
                      </Typography>
                    </Box>

                    {/* Slab rows */}
                    {slabs.map((slab, idx) => {
                      const qualifies = slab.minForms !== '' && count >= Number(slab.minForms);
                      const mul = parseFloat(slab.multiplier);
                      const slabResult = qualifies && !isNaN(mul) ? Math.round(count * pts * mul * 10000) / 10000 : null;
                      return (
                        <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#555', fontWeight: 700, minWidth: 50 }}>
                            Slab {idx + 1}
                          </Typography>
                          <TextField size="small" type="number" label="Min Forms"
                            value={slab.minForms}
                            onChange={e => setLocalSlabs(prev => {
                              const updated = [...(prev[product] || [])];
                              updated[idx] = { ...updated[idx], minForms: e.target.value };
                              return { ...prev, [product]: updated };
                            })}
                            inputProps={{ step: 1, min: 0 }}
                            placeholder="e.g. 10"
                            sx={{ width: 110 }} />
                          <TextField size="small" type="number" label="Multiplier"
                            value={slab.multiplier}
                            onChange={e => setLocalSlabs(prev => {
                              const updated = [...(prev[product] || [])];
                              updated[idx] = { ...updated[idx], multiplier: e.target.value };
                              return { ...prev, [product]: updated };
                            })}
                            inputProps={{ step: 'any' }}
                            placeholder="e.g. 1.5"
                            sx={{ width: 110 }} />
                          <IconButton size="small" color="error"
                            onClick={() => setLocalSlabs(prev => ({
                              ...prev,
                              [product]: (prev[product] || []).filter((_, i) => i !== idx)
                            }))}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                          {/* Qualifies badge with count × multiplier = result */}
                          {qualifies && slabResult !== null && (
                            <Chip
                              label={`✓ ${count} × ${slab.multiplier} = ${slabResult} pts`}
                              size="small"
                              sx={{ bgcolor: '#e8f4fd', color: '#1565c0', fontWeight: 700, fontSize: 10 }}
                            />
                          )}
                        </Box>
                      );
                    })}

                    {/* Add Slab button */}
                    <Button size="small" variant="outlined"
                      onClick={() => setLocalSlabs(prev => ({
                        ...prev,
                        [product]: [...(prev[product] || []), { minForms: '', multiplier: '' }]
                      }))}
                      sx={{ color: BRAND.primary, borderColor: BRAND.primary, fontWeight: 700, fontSize: 11, mb: 1 }}>
                      + Add Slab
                    </Button>

                    {/* Total of all qualifying slabs */}
                    {roundedTotal > 0 && (
                      <Box sx={{ mt: 1, p: 1, bgcolor: '#f3e8ff', borderRadius: 1.5, border: '1px solid #c4b5fd' }}>
                        <Typography variant="caption" sx={{ color: '#7c3aed', fontWeight: 700 }}>
                          🏆 Total Contest Bonus: {qualifyingSlabs.filter(s => s.result).map(s => `${s.result}`).join(' + ')} = <b>+{roundedTotal} pts</b>
                        </Typography>
                      </Box>
                    )}

                    {/* Reason */}
                    <TextField size="small" fullWidth label="Reason (FSE will see this)"
                      value={reason}
                      onChange={e => setLocalProductAdj(prev => ({ ...prev, [product]: { ...prev[product], reason: e.target.value } }))}
                      placeholder="e.g. Contest April 2026"
                      sx={{ mt: 1 }} />
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Manual Correction Section */}
          <Box sx={{ mt: 2, mb: 1.5, p: 1.5, bgcolor: '#fff8e1', borderRadius: 2, border: '1.5px solid #f4a261' }}>
            <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 1, color: '#e65100', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              🔧 Manual Correction
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Use this to fix mistakes or add/subtract points directly.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField size="small" type="number" label="Points (+/-)"
                value={manualDelta}
                onChange={e => setManualDelta(e.target.value)}
                inputProps={{ step: 'any' }}
                placeholder="e.g. +5, -2"
                sx={{ width: 130 }} />
              <TextField size="small" label="Reason (required)"
                value={manualReason}
                onChange={e => setManualReason(e.target.value)}
                placeholder="e.g. Correction for missed entry"
                sx={{ flex: 1 }} />
            </Box>
          </Box>

          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#e6f4ea', borderRadius: 2 }}>
            <Typography variant="body2" fontWeight={700} sx={{ color: BRAND.primary }}>
              Current: {Math.round(((autoPoints || 0) + existingAdj) * 10) / 10} pts
              {(overallDelta + productDelta + manualCorrectionDelta) !== 0 && (
                <> → After: <span style={{ color: (overallDelta + productDelta + manualCorrectionDelta) > 0 ? '#2e7d32' : '#c62828' }}>{newTotal} pts ({(overallDelta + productDelta + manualCorrectionDelta) > 0 ? '+' : ''}{Math.round((overallDelta + productDelta + manualCorrectionDelta) * 10) / 10})</span></>
              )}
            </Typography>
          </Box>

          {/* Adjustment History */}
          {adjHistory.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Adjustment History
              </Typography>
              {adjHistory.slice().reverse().map((h) => (
                <Box key={h._id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.8, p: 1, bgcolor: '#f9f9f9', borderRadius: 1.5, border: '1px solid #e0e0e0' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" fontWeight={700} sx={{ color: h.delta >= 0 ? '#2e7d32' : '#c62828' }}>
                      {h.delta >= 0 ? '+' : ''}{h.delta} pts
                    </Typography>
                    {h.reason && <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{h.reason}</Typography>}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10 }}>
                      {new Date(h.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => setDeleteDialog({ historyId: h._id, delta: h.delta, reason: h.reason })}
                    sx={{ '&:hover': { bgcolor: '#fdecea' } }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button color="error" variant="outlined" size="small"
            onClick={() => {
              if (!window.confirm('Reset all slabs and corrections?')) return;
              const reset = {};
              Object.keys(empData?.productBreakdown || {}).forEach(k => { reset[k] = []; });
              setLocalSlabs(reset);
              setManualDelta('');
              setManualReason('');
            }}
            sx={{ fontWeight: 700 }}>
            🗑 Reset All to 0
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleClose} color="inherit">Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}
              sx={{ bgcolor: BRAND.primary, fontWeight: 700 }}>
              {saving ? 'Saving…' : 'Save Points'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Delete Adjustment Dialog */}
      {deleteDialog && (
        <Dialog open onClose={() => { setDeleteDialog(null); setDeleteReason(''); }} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, color: '#c62828', pb: 1 }}>🗑 Delete Adjustment</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Removing: <strong style={{ color: deleteDialog.delta >= 0 ? '#2e7d32' : '#c62828' }}>
                {deleteDialog.delta >= 0 ? '+' : ''}{deleteDialog.delta} pts
              </strong>
              {deleteDialog.reason && ` — "${deleteDialog.reason}"`}
            </Typography>
            <TextField fullWidth size="small" multiline rows={2}
              label="Reason for deletion (FSE will be notified)"
              value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
              placeholder="e.g. Entered by mistake" />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setDeleteDialog(null); setDeleteReason(''); }} color="inherit">Cancel</Button>
            <Button variant="contained" color="error" disabled={deleteSaving || !deleteReason.trim()}
              onClick={async () => {
                setDeleteSaving(true);
                await onDeleteAdj(eData._id, deleteDialog.historyId, deleteReason);
                setDeleteDialog(null);
                setDeleteReason('');
                setDeleteSaving(false);
              }}
              sx={{ fontWeight: 700 }}>
              {deleteSaving ? 'Deleting…' : 'Confirm Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function MerchantForms({ firstLoad = true, onLoaded }) {
  const [forms,      setForms]      = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [activeTab,  setActiveTab]  = useState('forms'); // 'forms' | 'activity'
  const [pointsActivity, setPointsActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState([]);
  const [dupOpen,    setDupOpen]    = useState(false);
  const [settledOpen,setSettledOpen]= useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [exportAnchor, setExportAnchor] = useState(null);
  const [notifying,  setNotifying]  = useState(null);
  const [notifySnack, setNotifySnack] = useState('');
  const [settling,   setSettling]   = useState(null);
  const [empPoints,  setEmpPoints]  = useState([]);   // [{_id, newJoinerName, pointsAdjustment}]
  const [editPtsOpen,  setEditPtsOpen]  = useState(false);
  const [editPtsEmp,   setEditPtsEmp]   = useState(null);
  const [editPtsValue, setEditPtsValue] = useState('');
  const [editPtsReason, setEditPtsReason] = useState('');
  const [editPtsSaving,setEditPtsSaving]= useState(false);
  const [productAdjustments, setProductAdjustments] = useState({});
  const [adjHistory, setAdjHistory] = useState([]);
  const [deleteAdjDialog, setDeleteAdjDialog] = useState(null); // { historyId, delta, reason }
  const [deleteAdjReason, setDeleteAdjReason] = useState('');
  const [deleteAdjSaving, setDeleteAdjSaving] = useState(false);
  // const [todayOnly, setTodayOnly] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [toDate, setToDate]         = useState('');
  const [fromDate, setFromDate]     = useState('');
  const [filterProduct, setFilterProduct] = useState(''); // product filter
  const [globalVerifyMap,  setGlobalVerifyMap]  = useState({});
  const [verifyKpiOpen,    setVerifyKpiOpen]    = useState(null); // 'Fully Verified' | 'Partially Done' | 'Not Found'
  const [drillProduct,     setDrillProduct]     = useState(null); // { product, status }
  
  // Manual Verification Modal
  const [manualVerifyOpen, setManualVerifyOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [verifyReason, setVerifyReason] = useState('');
  const [verifyingManually, setVerifyingManually] = useState(false);
  
  // Employee Form Details Modal (for duplicate comparison)
  const [employeeFormDetails, setEmployeeFormDetails] = useState(null); // { employeeName, form, duplicate }

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [formsRes, dupRes, ptsRes] = await Promise.all([
        fetch(`${EMP_API}/forms/admin/all`),
        fetch(`${EMP_API}/forms/admin/duplicates`),
        fetch(`${EMP_API}/forms/admin/employee-points`),
      ]);
      if (!formsRes.ok) throw new Error('Failed to load merchant forms');
      setForms(await formsRes.json());
      setDuplicates(dupRes.ok ? await dupRes.json() : []);
      setEmpPoints(ptsRes.ok ? await ptsRes.json() : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setPageLoading(false);
      if (onLoaded) onLoaded();
    }
  }, []);

  const handleSettle = useCallback(async (dup, idx, note) => {    setSettling(idx);
    try {
      const res = await fetch(`${EMP_API}/forms/admin/settle-duplicate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerNumber: dup._id.customerNumber,
          customerName:   dup.customerNames[0] || '',
          product:        dup._id.formFillingFor,
          employees:      dup.employees,
          note:           note || '',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotifySnack('✓ Duplicate marked as settled. Record saved to history.');
        load(); // refresh to remove from active list
      } else {
        setNotifySnack(`Error: ${data.message}`);
      }
    } catch {
      setNotifySnack('Failed to settle. Please try again.');
    } finally {
      setSettling(null);
    }
  }, []);

  const handleEditPoints = useCallback(async (empName, empData, autoPoints, productBreakdown = {}) => {
    let data = empData;
    if (!data?._id) {
      try {
        const res = await fetch(`${EMP_API}/forms/admin/init-employee-points`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newJoinerName: empName })
        });
        if (res.ok) {
          data = await res.json();
          const ptsRes = await fetch(`${EMP_API}/forms/admin/employee-points`);
          if (ptsRes.ok) setEmpPoints(await ptsRes.json());
        }
      } catch {}
    }
    setEditPtsEmp({ empName, empData: data, autoPoints, productBreakdown });
    setEditPtsValue(data?.pointsAdjustment !== undefined ? String(data.pointsAdjustment) : '0');
    setEditPtsReason('');
    // Init per-product adjustments
    const initAdj = {};
    Object.keys(productBreakdown || {}).forEach(p => { initAdj[p] = { value: '0', reason: '' }; });
    setProductAdjustments(initAdj);
    // Fetch adjustment history
    if (data?._id) {
      fetch(`${EMP_API}/forms/admin/adjustment-history/${data._id}`)
        .then(r => r.ok ? r.json() : []).then(setAdjHistory).catch(() => setAdjHistory([]));
    }
    setEditPtsOpen(true);
  }, []);

  const handleSavePoints = useCallback(async () => {
    if (!editPtsEmp?.empData?._id) return;
    setEditPtsSaving(true);
    try {
      const newAdj     = parseFloat(editPtsValue) || 0;
      const currentAdj = editPtsEmp.empData.pointsAdjustment || 0;
      const delta      = newAdj - currentAdj;

      // Calculate total per-product delta
      const productEntries = Object.entries(productAdjustments).filter(([, v]) => parseFloat(v.value) !== 0);
      const productDelta   = productEntries.reduce((sum, [, v]) => sum + (parseFloat(v.value) || 0), 0);
      const totalDelta     = delta + productDelta;

      const res = await fetch(`${EMP_API}/forms/admin/adjust-points/${editPtsEmp.empData._id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ adjustment: totalDelta, reason: editPtsReason || 'Points adjusted by admin' }),
      });
      if (res.ok) {
        const newTotal = Math.round(((editPtsEmp.autoPoints || 0) + newAdj + productDelta) * 10) / 10;

        // Send one notification per product that has an adjustment + reason
        const productNotifPromises = productEntries
          .filter(([, v]) => v.reason.trim())
          .map(([product, v]) =>
            fetch(`${EMP_API}/requests/notify-points`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                employeeName: editPtsEmp.empName,
                adjustment:   parseFloat(v.value),
                newTotal,
                reason: `${product}: ${parseFloat(v.value) >= 0 ? '+' : ''}${v.value} pts — ${v.reason}`,
              }),
            }).catch(() => {})
          );

        // Send overall notification if overall reason given
        const overallNotif = editPtsReason.trim()
          ? fetch(`${EMP_API}/requests/notify-points`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                employeeName: editPtsEmp.empName,
                adjustment:   totalDelta,
                newTotal,
                reason: editPtsReason,
              }),
            }).catch(() => {})
          : null;

        await Promise.all([...productNotifPromises, overallNotif].filter(Boolean));

        setNotifySnack(`✓ Points updated for ${editPtsEmp.empName}`);
        setEditPtsOpen(false);
        setEditPtsReason('');
        setProductAdjustments({});
        load();
      } else {
        const d = await res.json();
        setNotifySnack(`Error: ${d.message}`);
      }
    } catch {
      setNotifySnack('Failed to update points.');
    } finally {
      setEditPtsSaving(false);
    }
  }, [editPtsEmp, editPtsValue, editPtsReason, load]);

  const handleNotify = useCallback(async (dup, idx) => {
    setNotifying(idx);
    try {
      const res  = await fetch(`${EMP_API}/requests/notify-duplicate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeNames: dup.employees,
          merchantName:  dup.customerNames[0] || '',
          merchantPhone: dup._id.customerNumber,
          product:       dup._id.formFillingFor,
        }),
      });
      const data = await res.json();
      setNotifySnack(res.ok ? `✓ Notified ${data.count} employee(s) about the duplicate.` : `Error: ${data.message}`);
    } catch {
      setNotifySnack('Failed to send notification. Please try again.');
    } finally {
      setNotifying(null);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await fetch(`${EMP_API}/requests/all-points-activity`);
      if (res.ok) setPointsActivity(await res.json());
    } catch { /* ignore */ } finally { setActivityLoading(false); }
  }, []);

  useEffect(() => { if (activeTab === 'activity') loadActivity(); }, [activeTab, loadActivity]);

  // Manual Verification Handlers
  const handleManualVerify = useCallback((form) => {
    setSelectedForm(form);
    setVerifyReason('');
    setManualVerifyOpen(true);
  }, []);

  const handleRevertVerification = useCallback(async (form) => {
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

      const checkRes = await fetch(
        `${EMP_API}/manual-verification/check?phone=${encodeURIComponent(form.customerNumber)}&product=${encodeURIComponent(product)}&month=${encodeURIComponent(month)}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!checkRes.ok) throw new Error('Failed to check manual verification');

      const checkData = await checkRes.json();

      if (!checkData.exists || !checkData.verification) {
        alert('❌ No manual verification found for this form');
        return;
      }

      const deleteRes = await fetch(`${EMP_API}/manual-verification/${checkData.verification._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!deleteRes.ok) {
        const err = await deleteRes.json();
        throw new Error(err.message || 'Failed to delete manual verification');
      }

      setNotifySnack(`✅ Manual verification reverted successfully!`);
      load();

    } catch (err) {
      console.error('Failed to revert manual verification:', err);
      setNotifySnack(`❌ Failed to revert verification: ${err.message}`);
    }
  }, [load]);

  const handleSubmitManualVerification = useCallback(async () => {
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

      setNotifySnack(`✅ Form manually verified successfully!`);
      setManualVerifyOpen(false);
      setSelectedForm(null);
      setVerifyReason('');
      load();

    } catch (err) {
      console.error('Failed to create manual verification:', err);
      setNotifySnack(`❌ Failed to verify form: ${err.message}`);
    } finally {
      setVerifyingManually(false);
    }
  }, [selectedForm, verifyReason, load]);

  // Set of phone numbers that are cross-employee duplicates
  const duplicatePhones = useMemo(() => {
    const s = new Set();
    duplicates.forEach(d => s.add(d._id.customerNumber));
    return s;
  }, [duplicates]);

  // Group forms by employee, filtered by search
  // const grouped = useMemo(() => {
  //   const q = search.toLowerCase();
  //   // const filtered = forms.filter(f =>
  //   //   !q ||
  //   //   (f.customerName   || '').toLowerCase().includes(q) ||
  //   //   (f.customerNumber || '').includes(q) ||
  //   //   (f.employeeName   || '').toLowerCase().includes(q) ||
  //   //   (f.location       || '').toLowerCase().includes(q)
  //   // );
  //   const today = new Date().toDateString();
  // const filtered = forms.filter(f => {
  //   if (todayOnly && new Date(f.createdAt).toDateString() !== today) return false;
  //   return (
  //     !q ||
  //     (f.customerName   || '').toLowerCase().includes(q) ||
  //     (f.customerNumber || '').includes(q) ||
  //     (f.employeeName   || '').toLowerCase().includes(q) ||
  //     (f.location       || '').toLowerCase().includes(q)
  //   );
  //   // const map = {};
  //   // filtered.forEach(f => {
  //   //   const key = f.employeeName || 'Unknown';
  //   //   if (!map[key]) map[key] = [];
  //   //   map[key].push(f);
  //   // });
  //   // return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  // }, [forms, search]);
  const grouped = useMemo(() => {
  const q = search.toLowerCase();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - todayStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const filtered = forms.filter(f => {
    if (dateFilter !== 'all') {
      const d = new Date(f.createdAt);
      if (dateFilter === 'today' && d < todayStart) return false;
      if (dateFilter === 'week'  && d < weekStart) return false;
      if (dateFilter === 'month' && d < monthStart) return false;
      if (dateFilter === 'custom') {
      if (fromDate && d < new Date(fromDate)) return false;
      if (toDate   && d > new Date(toDate + 'T23:59:59')) return false;
      }
    }

    // Product filter
    if (filterProduct) {
      const p = (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim();
      if (p !== filterProduct.toLowerCase().trim()) return false;
    }

    return (
      !q ||
      (f.customerName   || '').toLowerCase().includes(q) ||
      (f.customerNumber || '').includes(q) ||
      (f.employeeName   || '').toLowerCase().includes(q) ||
      (f.location       || '').toLowerCase().includes(q) ||
      (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().includes(q)
    );
  });
  const map = {};
  filtered.forEach(f => {
    const key = f.employeeName || 'Unknown';
    if (!map[key]) map[key] = [];
    map[key].push(f);
  });
  return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
}, [forms, search, dateFilter, fromDate, toDate, filterProduct]);

  // Auto-detect all products with counts from all forms
  const productCounts = useMemo(() => {
    const map = {};
    forms.forEach(f => {
      const p = (f.formFillingFor || f.tideProduct || f.brand || '').trim();
      if (p) {
        if (!map[p]) map[p] = 0;
        map[p]++;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [forms]);



  const totalDupCount = duplicates.length;
  const settledCount  = duplicates.filter(d => d.settled).length;
  const activeCount   = totalDupCount - settledCount;

  // Map empName → points data
  const empPointsMap = useMemo(() => {
    const m = {};
    empPoints.forEach(e => { m[e.newJoinerName] = e; });
    return m;
  }, [empPoints]);

  // Fetch global verification for all filtered forms
  const getFormProduct = (f) => (f?.tideProduct || f?.formFillingFor || f?.brand || '').toLowerCase().trim();
  const getFormKey     = (f) => { const p = getFormProduct(f); return p ? `${f.customerNumber}__${p}` : f.customerNumber; };

  useEffect(() => {
  const filteredForms = grouped.flatMap(([, empForms]) => empForms);
  if (!filteredForms.length) { setGlobalVerifyMap({}); return; }

  const BATCH = 50;
  const batches = [];
  for (let i = 0; i < filteredForms.length; i += BATCH) {
    batches.push(filteredForms.slice(i, i + BATCH));
  }

  Promise.all(batches.map(batch => {
    const phones   = batch.map(f => f.customerNumber).join(',');
    const names    = batch.map(f => encodeURIComponent(f.customerName || '')).join(',');
    const products = batch.map(f => encodeURIComponent(getFormProduct(f))).join(',');
    const months   = batch.map(f => encodeURIComponent(new Date(f.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' }))).join(',');
    return fetch(`${EMP_API}/verify/bulk-admin?phones=${encodeURIComponent(phones)}&names=${names}&products=${products}&months=${months}`)
      .then(r => r.ok ? r.json() : {})
      .catch(() => ({}));
  })).then(results => {
    const merged = Object.assign({}, ...results);
    setGlobalVerifyMap(merged);
  });
}, [grouped]); // eslint-disable-line

  // Compute verification KPI counts from global map
  const verifyKpiCounts = useMemo(() => {
    const filteredForms = grouped.flatMap(([, empForms]) => empForms);
    const counts = { 'Fully Verified': 0, 'Partially Done': 0, 'Not Found': 0 };
    filteredForms.forEach(f => {
      const status = globalVerifyMap[getFormKey(f)]?.status || 'Not Found';
      if (status === 'Fully Verified') counts['Fully Verified']++;
      else if (status === 'Partially Done') counts['Partially Done']++;
      else counts['Not Found']++;
    });
    return counts;
  }, [grouped, globalVerifyMap]); // eslint-disable-line

  // Breakdown by product for the clicked KPI
  const verifyBreakdown = useMemo(() => {
    if (!verifyKpiOpen) return [];
    const filteredForms = grouped.flatMap(([, empForms]) => empForms);
    const productMap = {};
    filteredForms.forEach(f => {
      const status  = globalVerifyMap[getFormKey(f)]?.status || 'Not Found';
      const rawProduct = f.formFillingFor || f.tideProduct || f.brand || '–';
      const product = rawProduct.toLowerCase() === 'msme' ? 'Tide MSME' : rawProduct;

      if (!productMap[product]) productMap[product] = { total: 0, matched: 0 };
      productMap[product].total++;
      if (status === verifyKpiOpen) productMap[product].matched++;
    });
    return Object.entries(productMap)
      .filter(([, v]) => v.matched > 0)
      .sort((a, b) => b[1].matched - a[1].matched);
  }, [verifyKpiOpen, grouped, globalVerifyMap]); // eslint-disable-line



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
          <style>{`@keyframes mfSpinner { to { transform: rotate(360deg); } }`}</style>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            border: '4px solid rgba(26,71,49,0.15)',
            borderTop: '4px solid #1a4731',
            animation: 'mfSpinner 0.9s linear infinite',
          }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a4731', letterSpacing: 3, textTransform: 'uppercase' }}>
            Merchant Forms
          </div>
        </div>,
        document.body
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2, visibility: pageLoading ? 'hidden' : 'visible' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.primary }}>Merchant Forms</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            All merchant submissions by employees — employee-wise view
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Duplicate Bell */}
          <Tooltip title={totalDupCount > 0 ? `${totalDupCount} cross-employee duplicate merchant(s)` : 'No cross-employee duplicates'}>
            <Badge badgeContent={totalDupCount} color="error" max={99}>
              <IconButton onClick={() => setDupOpen(true)}
                sx={{ border: `1.5px solid ${totalDupCount > 0 ? '#c62828' : BRAND.primaryLight}`,
                  color: totalDupCount > 0 ? '#c62828' : BRAND.primary,
                  bgcolor: totalDupCount > 0 ? '#fdecea' : 'transparent',
                  '&:hover': { bgcolor: totalDupCount > 0 ? '#ffcdd2' : BRAND.primaryLight } }}>
                <NotificationsIcon />
              </IconButton>
            </Badge>
          </Tooltip>
  {/* <Button
  variant={todayOnly ? 'contained' : 'outlined'}
  onClick={() => setTodayOnly(prev => !prev)}
  sx={{
    borderColor: BRAND.primary,
    color: todayOnly ? '#fff' : BRAND.primary,
    bgcolor: todayOnly ? BRAND.primary : 'transparent',
    fontWeight: 700,
    '&:hover': { bgcolor: todayOnly ? '#0f3320' : BRAND.primaryLight }
  }}
>
  
  Today Only
</Button> */}

          {/* Export Button */}
          <Button
            startIcon={exporting ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <DownloadIcon />}
            variant="contained"
            disabled={exporting || forms.length === 0}
            onClick={e => setExportAnchor(e.currentTarget)}
            sx={{ bgcolor: BRAND.primary, fontWeight: 700, '&:hover': { bgcolor: '#0f3320' } }}
          >
            Export
          </Button>
          <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}
            PaperProps={{ sx: { borderRadius: 2, mt: 0.5, minWidth: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' } }}>
            <MenuItem onClick={() => { setExportAnchor(null); exportToExcel(forms); }}
              sx={{ gap: 1.5, py: 1.5 }}>
              <ListItemIcon><TableChartIcon sx={{ color: '#217346' }} /></ListItemIcon>
              <ListItemText primary="Export to Excel" secondary=".xlsx file download" />
            </MenuItem>
            <MenuItem onClick={() => { setExportAnchor(null); exportToGoogleSheets(forms, setExporting, setError); }}
              sx={{ gap: 1.5, py: 1.5 }}>
              <ListItemIcon><GridOnIcon sx={{ color: '#0F9D58' }} /></ListItemIcon>
              <ListItemText primary="Export to Google Sheets" secondary="Opens in new tab" />
            </MenuItem>
          </Menu>

          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}
            sx={{ borderColor: BRAND.primary, color: BRAND.primary, fontWeight: 700 }}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Tab Switcher */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
          sx={{ '& .MuiTab-root': { fontWeight: 700, fontSize: '0.82rem', color: '#555', opacity: 1 },
               '& .MuiTabs-indicator': { bgcolor: BRAND.primary },
               '& .MuiTab-root.Mui-selected': { color: BRAND.primary, fontWeight: 800 } }}>
          <Tab value="forms" label="Merchant Forms" />
          <Tab value="activity" label="Points Activity" />
        </Tabs>
      </Box>

      {/* Points Activity Tab */}
      {activeTab === 'activity' && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: BRAND.primary }}>Points Activity Log</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {selectedActivity.length > 0 && (
                <Button size="small" variant="contained" color="error"
                  onClick={async () => {
                    if (!window.confirm(`Delete ${selectedActivity.length} selected log(s)? FSE and TL notifications will NOT be affected.`)) return;
                    try {
                      const res = await fetch(`${EMP_API}/requests/delete-notifications-bulk`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: selectedActivity }),
                      });
                      if (res.ok) {
                        setPointsActivity(prev => prev.filter(x => !selectedActivity.includes(x._id)));
                        setSelectedActivity([]);
                        setNotifySnack(`✓ ${selectedActivity.length} log(s) deleted from admin view`);
                      }
                    } catch { setNotifySnack('Failed to delete some entries'); }
                  }}
                  sx={{ fontWeight: 700 }}>
                  🗑 Delete Selected ({selectedActivity.length})
                </Button>
              )}
              <Button size="small" startIcon={<RefreshIcon />} onClick={loadActivity} variant="outlined"
                sx={{ borderColor: BRAND.primary, color: BRAND.primary, fontWeight: 700 }}>
                Refresh
              </Button>
            </Box>
          </Box>
          {activityLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: BRAND.primary }} /></Box>
          ) : pointsActivity.length === 0 ? (
            <Card sx={{ textAlign: 'center', py: 6, border: `1.5px dashed ${BRAND.primaryLight}` }}>
              <Typography color="text.secondary">No points activity yet.</Typography>
            </Card>
          ) : (
            <TableContainer component={Card} sx={{ borderRadius: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary', borderBottom: '2px solid', borderColor: 'divider', bgcolor: '#f9f9f9' } }}>
                    <TableCell>FSE Name</TableCell>
                    <TableCell>Change</TableCell>
                    <TableCell>Before</TableCell>
                    <TableCell>After</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pointsActivity.map(a => {
                    const adj = a.adjustment ?? a.profileChanges?.adjustment ?? 0;
                    const before = a.beforeTotal ?? a.profileChanges?.beforeTotal;
                    const after  = a.newTotal ?? a.profileChanges?.newTotal;
                    const isAdd  = Number(adj) >= 0;
                    return (
                      <TableRow key={a._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ bgcolor: BRAND.primary, width: 28, height: 28, fontSize: 11, fontWeight: 700 }}>
                              {(a.employeeName || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </Avatar>
                            <Typography variant="body2" fontWeight={700}>{a.employeeName}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={`${isAdd ? '+' : ''}${adj} pts`} size="small"
                            sx={{ bgcolor: isAdd ? '#e6f4ea' : '#fdecea', color: isAdd ? '#2e7d32' : '#c62828', fontWeight: 800, fontSize: 12 }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{before !== undefined ? `${before} pts` : '–'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} sx={{ color: isAdd ? '#2e7d32' : '#c62828' }}>
                            {after !== undefined ? `${after} pts` : '–'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>
                          <Tooltip title={a.reason || '–'} placement="top">
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', cursor: 'help' }}>
                              {a.reason || '–'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Delete from admin log (FSE/TL notifications unaffected)">
                            <IconButton size="small" color="error"
                              onClick={async () => {
                                if (!window.confirm('Delete from admin log? FSE and TL notifications will NOT be affected.')) return;
                                try {
                                  const res = await fetch(`${EMP_API}/requests/delete-notification/${a._id}`, { method: 'DELETE' });
                                  if (res.ok) {
                                    setPointsActivity(prev => prev.filter(x => x._id !== a._id));
                                    setNotifySnack('✓ Removed from admin log');
                                  }
                                } catch { setNotifySnack('Failed to delete'); }
                              }}
                              sx={{ '&:hover': { bgcolor: '#fdecea' } }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Merchant Forms Tab */}
      {activeTab === 'forms' && (<>

      {/* Summary KPIs */}
      {(() => {
        const filteredForms = grouped.flatMap(([, empForms]) => empForms);
        const filteredTotal = filteredForms.length;
        const filteredEmps  = grouped.length;
        return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: 'Total Submissions', value: filteredTotal, color: BRAND.primary, bg: '#e6f4ea', key: 'total' },
          { label: 'Employees',         value: filteredEmps,  color: '#1565c0',     bg: '#e3f2fd', key: 'emp' },
          { label: 'Cross Duplicates',  value: activeCount,   color: '#c62828',     bg: '#fdecea', key: 'dup' },
          { label: 'Settled Duplicates',value: settledCount,  color: '#2e7d32',     bg: '#e6f4ea', key: 'settled' },
        ].map(k => (
          <Card key={k.label}
            onClick={
              k.key === 'dup'     && activeCount   > 0 ? () => setDupOpen(true)     :
              k.key === 'settled' && settledCount  > 0 ? () => setSettledOpen(true) :
              undefined
            }
            sx={{
              borderRadius: 3,
              border: `1.5px solid ${k.color}20`,
              cursor: (k.key === 'dup' && activeCount > 0) || (k.key === 'settled' && settledCount > 0) ? 'pointer' : 'default',
              transition: 'box-shadow 0.2s, transform 0.15s',
              ...((k.key === 'dup' && activeCount > 0) && { '&:hover': { boxShadow: '0 4px 20px rgba(198,40,40,0.18)', transform: 'translateY(-2px)' } }),
              ...((k.key === 'settled' && settledCount > 0) && { '&:hover': { boxShadow: '0 4px 20px rgba(46,125,50,0.18)', transform: 'translateY(-2px)' } }),
            }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="h4" fontWeight={800} sx={{ color: k.color }}>{k.value}</Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                {k.label}
                {((k.key === 'dup' && activeCount > 0) || (k.key === 'settled' && settledCount > 0)) && (
                  <Typography component="span" variant="caption" sx={{ ml: 1, color: k.color, fontWeight: 700 }}>
                    (click to view)
                  </Typography>
                )}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
        );
      })()}

      {/* Duplicate warning banner */}
      {activeCount > 0 && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}
          action={<Button size="small" color="inherit" fontWeight={700} onClick={() => setDupOpen(true)}>View All</Button>}>
          <strong>{activeCount} cross-employee duplicate merchant(s) detected.</strong> Same merchant submitted by multiple employees.
        </Alert>
      )}

      {/* Verification KPI cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: 'Fully Verified',  key: 'Fully Verified',  color: '#2e7d32', bg: '#e6f4ea', icon: '✓' },
          { label: 'Partially Done',  key: 'Partially Done',  color: '#f57f17', bg: '#fff8e1', icon: '◑' },
          { label: 'Not Found',       key: 'Not Found',       color: '#888',    bg: '#f5f5f5', icon: '–' },
        ].map(k => (
          <Card key={k.key} onClick={() => setVerifyKpiOpen(k.key)}
            sx={{ borderRadius: 3, border: `1.5px solid ${k.color}30`, cursor: 'pointer',
              transition: 'box-shadow 0.2s, transform 0.15s',
              '&:hover': { boxShadow: `0 4px 20px ${k.color}30`, transform: 'translateY(-2px)' } }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="h4" fontWeight={800} sx={{ color: k.color }}>
                {k.icon} {verifyKpiCounts[k.key] || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                {k.label}
                <Typography component="span" variant="caption" sx={{ ml: 1, color: k.color, fontWeight: 700 }}>
                  (click for breakdown)
                </Typography>
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Verification KPI Breakdown Dialog */}
      <Dialog open={!!verifyKpiOpen} onClose={() => setVerifyKpiOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={800} component="span">
            {verifyKpiOpen} — Product Breakdown
          </Typography>
          <IconButton onClick={() => setVerifyKpiOpen(null)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {verifyBreakdown.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No data yet.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' } }}>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">{verifyKpiOpen}</TableCell>
                  <TableCell align="right">Total Submitted</TableCell>
                  <TableCell align="right">% Rate</TableCell>
                  <TableCell align="right">Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {verifyBreakdown.map(([product, v]) => (
                  <TableRow key={product} hover sx={{ cursor: 'pointer' }}
                    onClick={() => setDrillProduct({ product, status: verifyKpiOpen })}>
                    <TableCell><ProductChip product={product} /></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#2e7d32' }}>{v.matched}</TableCell>
                    <TableCell align="right">{v.total}</TableCell>
                    <TableCell align="right">
                      <Chip label={`${Math.round((v.matched / v.total) * 100)}%`} size="small"
                        sx={{ fontWeight: 700, bgcolor: '#e6f4ea', color: '#2e7d32' }} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>View ›</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerifyKpiOpen(null)} sx={{ color: BRAND.primary, fontWeight: 700 }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Drill-down: Merchant + FSE list for selected product */}
      {drillProduct && (() => {
        const filteredForms = grouped.flatMap(([, empForms]) => empForms);
        const drillForms = filteredForms.filter(f => {
          const rawProduct = f.formFillingFor || f.tideProduct || f.brand || '–';
          const product = rawProduct.toLowerCase() === 'msme' ? 'Tide MSME' : rawProduct;
          const status  = globalVerifyMap[getFormKey(f)]?.status || 'Not Found';
          return product === drillProduct.product && status === drillProduct.status;
        });
        return (
          <Dialog open={!!drillProduct} onClose={() => setDrillProduct(null)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" component="span" fontWeight={800}>
                  <ProductChip product={drillProduct.product} /> &nbsp; {drillProduct.status}
                </Typography>
                <Typography variant="caption" color="text.secondary">{drillForms.length} merchant{drillForms.length !== 1 ? 's' : ''}</Typography>
              </Box>
              <IconButton onClick={() => setDrillProduct(null)} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
              {drillForms.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No merchants found.</Typography>
              ) : (
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary', bgcolor: '#f9f9f9' } }}>
                      <TableCell>#</TableCell>
                      <TableCell>Merchant</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>FSE</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {drillForms.map((f, i) => {
                      const isManualVerification = globalVerifyMap[getFormKey(f)]?.manualVerification;
                      return (
                      <TableRow key={f._id} hover>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 11 }}>{i + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {f.customerName}
                            {isManualVerification && (
                              <Tooltip title={`Manually verified by ${globalVerifyMap[getFormKey(f)]?.verifiedBy || 'Admin'}`}>
                                <Box component="span" sx={{ fontSize: 11, color: '#7c3aed', cursor: 'help' }}>👤</Box>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{f.customerNumber}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{f.location}</TableCell>
                        <TableCell>
                          <Chip label={f.employeeName || '–'} size="small"
                            avatar={<Avatar sx={{ bgcolor: BRAND.primary, fontSize: 10 }}>{initials(f.employeeName)}</Avatar>}
                            sx={{ fontWeight: 600, fontSize: 11 }} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>
                          {new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </TableCell>
                        <TableCell>
                          {drillProduct.status === 'Not Found' && !isManualVerification && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleManualVerify(f);
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
                                handleRevertVerification(f);
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
                    )})}
                  </TableBody>
                </Table>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDrillProduct(null)} sx={{ color: BRAND.primary, fontWeight: 700 }}>Close</Button>
            </DialogActions>
          </Dialog>
        );
      })()}

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

      {/* Employee Form Details Modal (for duplicate comparison) */}
      {employeeFormDetails && (
        <Dialog 
          open 
          onClose={() => setEmployeeFormDetails(null)} 
          maxWidth="md" 
          fullWidth
          PaperProps={{ sx: { maxHeight: '90vh' } }}>
          <DialogTitle sx={{ bgcolor: BRAND.primary, color: '#fff', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" component="span" fontWeight={800}>
                Form Details - {employeeFormDetails.employeeName}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {employeeFormDetails.duplicate.customerNames[0]} ({employeeFormDetails.duplicate._id.customerNumber})
              </Typography>
            </Box>
            <IconButton onClick={() => setEmployeeFormDetails(null)} size="small" sx={{ color: '#fff' }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: BRAND.primary }}>
                Basic Information
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Customer Name</Typography>
                  <Typography variant="body2" fontWeight={600}>{employeeFormDetails.form.customerName}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Customer Phone</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                    {employeeFormDetails.form.customerNumber}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Location</Typography>
                  <Typography variant="body2" fontWeight={600}>{employeeFormDetails.form.location}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Visit Status</Typography>
                  <Typography variant="body2" fontWeight={600}>{employeeFormDetails.form.status}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Product</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {employeeFormDetails.form.formFillingFor || employeeFormDetails.form.tideProduct || employeeFormDetails.form.brand || '–'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Submitted On</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(employeeFormDetails.form.createdAt).toLocaleString('en-IN', { 
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Product-Specific Fields */}
            <Box sx={{ mb: 3, p: 2, bgcolor: '#fff8e1', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: '#f57f17' }}>
                Product-Specific Details
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
                {/* Tide Fields */}
                {employeeFormDetails.form.tide_qrPosted && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Tide QR Posted</Typography>
                    <Typography variant="body2" fontWeight={600}>{employeeFormDetails.form.tide_qrPosted}</Typography>
                  </Box>
                )}
                {employeeFormDetails.form.tide_upiTxnDone && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Tide UPI Txn Done</Typography>
                    <Typography variant="body2" fontWeight={600}>{employeeFormDetails.form.tide_upiTxnDone}</Typography>
                  </Box>
                )}
                
                {/* Insurance Fields */}
                {employeeFormDetails.form.ins_vehicleNumber && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Vehicle Number</Typography>
                    <Typography variant="body2" fontWeight={600}>{employeeFormDetails.form.ins_vehicleNumber}</Typography>
                  </Box>
                )}
                {employeeFormDetails.form.ins_vehicleType && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Vehicle Type</Typography>
                    <Typography variant="body2" fontWeight={600}>{employeeFormDetails.form.ins_vehicleType}</Typography>
                  </Box>
                )}
                {employeeFormDetails.form.ins_insuranceType && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Insurance Type</Typography>
                    <Typography variant="body2" fontWeight={600}>{employeeFormDetails.form.ins_insuranceType}</Typography>
                  </Box>
                )}
                
                {/* PineLab Fields */}
                {employeeFormDetails.form.pine_cardTxn && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">PineLab Card Txn</Typography>
                    <Typography variant="body2" fontWeight={600}>{employeeFormDetails.form.pine_cardTxn}</Typography>
                  </Box>
                )}
                {employeeFormDetails.form.pine_wifiConnected && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">PineLab WiFi Connected</Typography>
                    <Typography variant="body2" fontWeight={600}>{employeeFormDetails.form.pine_wifiConnected}</Typography>
                  </Box>
                )}
                
                {/* Credit Card Fields */}
                {employeeFormDetails.form.cc_cardName && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Credit Card Name</Typography>
                    <Typography variant="body2" fontWeight={600}>{employeeFormDetails.form.cc_cardName}</Typography>
                  </Box>
                )}
                
                {/* Tide Insurance Fields */}
                {employeeFormDetails.form.tideIns_type && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Tide Insurance Type</Typography>
                    <Typography variant="body2" fontWeight={600}>{employeeFormDetails.form.tideIns_type}</Typography>
                  </Box>
                )}
              </Box>
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Tip:</strong> Click on another employee's name to open their form details in a new window for side-by-side comparison.
            </Alert>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setEmployeeFormDetails(null)} sx={{ color: BRAND.primary, fontWeight: 700 }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Date Filter */}
<Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
  {['all', 'today', 'week', 'month'].map(f => (
    <Button key={f} size="small"
      variant={dateFilter === f ? 'contained' : 'outlined'}
      onClick={() => { setDateFilter(f); setFromDate(''); setToDate(''); }}
      sx={{ fontWeight: 700, textTransform: 'capitalize',
        bgcolor: dateFilter === f ? BRAND.primary : 'transparent',
        borderColor: BRAND.primary, color: dateFilter === f ? '#fff' : BRAND.primary,
        '&:hover': { bgcolor: dateFilter === f ? '#0f3320' : BRAND.primaryLight }
      }}>
      {f === 'all' ? 'All' : f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
    </Button>
  ))}
  <TextField size="small" type="date" label="From" value={fromDate}
    onChange={e => { setFromDate(e.target.value); setDateFilter('custom'); }}
    InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
  <TextField size="small" type="date" label="To" value={toDate}
    onChange={e => { setToDate(e.target.value); setDateFilter('custom'); }}
    InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
  {(dateFilter !== 'all' || fromDate || toDate || search) && (
    <Button size="small" variant="outlined" color="error"
      onClick={() => { setDateFilter('all'); setFromDate(''); setToDate(''); setSearch(''); }}
      sx={{ fontWeight: 700 }}>
      Reset
    </Button>
  )}
</Box>



      {/* Search */}
      <TextField fullWidth size="small" placeholder="Search by merchant name, phone, employee, location or product…"
        value={search} onChange={e => setSearch(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment> }} />

      {error && <Alert severity="error" sx={{ mb: 3 }} action={<Button size="small" onClick={load}>Retry</Button>}>{error}</Alert>}

      {loading ? (
        <Box>
          {/* Search bar skeleton */}
          <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 2, mb: 3 }} />
          {/* KPI cards skeleton */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="40%" height={40} />
                </CardContent>
              </Card>
            ))}
          </Box>
          {/* Employee group card skeletons */}
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} sx={{ mb: 2, borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="30%" height={22} />
                  <Skeleton variant="text" width="15%" height={16} />
                </Box>
                <Skeleton variant="rectangular" width={80} height={28} sx={{ borderRadius: 20 }} />
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : grouped.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6, border: `1.5px dashed ${BRAND.primaryLight}` }}>
          <Typography color="text.secondary">No merchant forms found.</Typography>
        </Card>
      ) : (
        grouped.map(([empName, empForms]) => (
          <EmployeeGroup key={empName} empName={empName} forms={empForms}
            duplicatePhones={duplicatePhones}
            empPointsData={empPointsMap[empName]}
            globalVerifyMap={globalVerifyMap}
            onEditPoints={handleEditPoints}
            onManualVerify={handleManualVerify}
            onRevertVerification={handleRevertVerification}
            onReload={load} />
        ))
      )}

      <DuplicatePanel 
        duplicates={duplicates} 
        open={dupOpen} 
        onClose={() => setDupOpen(false)}
        onNotify={handleNotify} 
        notifying={notifying}
        onSettle={handleSettle} 
        settling={settling}
        forms={forms}
        onEmployeeClick={setEmployeeFormDetails}
      />
      {/* <Button
        variant={todayOnly ? 'contained' : 'outlined'}
        onClick={() => setTodayOnly(prev => !prev)}
        sx={{
          borderColor: BRAND.primary,
          color: todayOnly ? '#fff' : BRAND.primary,
          bgcolor: todayOnly ? BRAND.primary : 'transparent',
          fontWeight: 700,
          '&:hover': { bgcolor: todayOnly ? '#0f3320' : BRAND.primaryLight }}}
>
  Today Only
</Button> */}


      {/* Edit Points Dialog */}
      <EditPointsDialog
        open={editPtsOpen}
        empData={editPtsEmp}
        adjHistory={adjHistory}
        EMP_API={EMP_API}
        BRAND={BRAND}
        POINTS_MAP={POINTS_MAP}
        onClose={() => { setEditPtsOpen(false); setEditPtsReason(''); setProductAdjustments({}); }}
        onSave={async ({ empData: eData, empName, autoPoints, editPtsValue: val, editPtsReason: reason, productAdjustments: prodAdj, productSlabs: prodSlabs, manualDelta: manDelta, manualReason: manReason }) => {
          try {
            const currentAdj = eData?.pointsAdjustment || 0;
            const productBreakdownData = editPtsEmp?.productBreakdown || {};

            // Slab-based delta per product — ALL qualifying slabs add up (cumulative)
            const slabEntries = [];
            let contestDelta = 0;
            Object.entries(prodSlabs || {}).forEach(([product, slabs]) => {
              const count = productBreakdownData[product] || 0;
              const pts   = POINTS_MAP[product] || 0;
              const validSlabs = (slabs || []).filter(s => s.minForms !== '' && s.multiplier !== '');
              validSlabs.forEach((slab, idx) => {
                if (count < Number(slab.minForms)) return;
                const mul = parseFloat(slab.multiplier);
                if (isNaN(mul)) return;
                const bonus = Math.round(count * pts * mul * 10000) / 10000;
                contestDelta += bonus;
                slabEntries.push({ product, count, pts, mul, bonus, slabIdx: idx + 1, reason: (prodAdj[product] || {}).reason || '' });
              });
            });

            const manualCorrDelta = parseFloat(manDelta) || 0;
            const totalDelta = contestDelta + manualCorrDelta;

            if (totalDelta === 0) {
              setNotifySnack('No changes to save — add slabs or manual correction.');
              return;
            }

            const beforeTotal = Math.round(((autoPoints || 0) + currentAdj) * 10) / 10;
            const newTotal    = Math.round(((autoPoints || 0) + currentAdj + totalDelta) * 10000) / 10000;

            // Save each slab as a SEPARATE adjustment history entry — sequentially to avoid race conditions
            let allOk = true;
            for (const { bonus, product, slabIdx } of slabEntries) {
              const r = await fetch(`${EMP_API}/forms/admin/adjust-points/${eData._id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  adjustment: bonus,
                  reason: `Contest Slab ${slabIdx}: ${product}`,
                }),
              });
              if (!r.ok) { allOk = false; break; }
            }
            // Manual correction as separate entry
            if (allOk && manualCorrDelta !== 0) {
              const r = await fetch(`${EMP_API}/forms/admin/adjust-points/${eData._id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  adjustment: manualCorrDelta,
                  reason: manReason || 'Manual correction',
                }),
              });
              if (!r.ok) allOk = false;
            }
            if (allOk) {
              const notifs = [];
              let runningTotal = beforeTotal;

              // Slab notifications per product — progressive before/after
              slabEntries.forEach(({ product, count, pts, mul, bonus, slabIdx, reason: pReason }) => {
                const slabBefore = Math.round(runningTotal * 10000) / 10000;
                const slabAfter  = Math.round((runningTotal + bonus) * 10000) / 10000;
                runningTotal = slabAfter;
                notifs.push(fetch(`${EMP_API}/requests/notify-points`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    employeeName: empName,
                    adjustment: bonus,
                    beforeTotal: slabBefore,
                    newTotal: slabAfter,
                    reason: `🏆 Contest Slab ${slabIdx}: ${product} — ${count} × ${pts} × ${mul} = ${bonus} pts${pReason ? ` — ${pReason}` : ''}`,
                  }),
                }).catch(() => {}));
              });

              // Manual correction notification
              if (manualCorrDelta !== 0 && manReason?.trim()) {
                const manBefore = Math.round(runningTotal * 10000) / 10000;
                const manAfter  = Math.round((runningTotal + manualCorrDelta) * 10000) / 10000;
                notifs.push(fetch(`${EMP_API}/requests/notify-points`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    employeeName: empName,
                    adjustment: manualCorrDelta,
                    beforeTotal: manBefore,
                    newTotal: manAfter,
                    reason: `🔧 Manual correction: ${manualCorrDelta > 0 ? '+' : ''}${manualCorrDelta} pts — ${manReason}`,
                  }),
                }).catch(() => {}));
              }

              await Promise.all(notifs);
              setNotifySnack(`✓ Points updated for ${empName}`);
              setEditPtsOpen(false); setEditPtsReason(''); setProductAdjustments({});
              load();
            } else {
              setNotifySnack('Error: Some slab points failed to save. Please try again.');
            }
          } catch { setNotifySnack('Failed to update points.'); }
        }}
        onDeleteAdj={async (empId, historyId, deleteReason) => {
          try {
            const res = await fetch(`${EMP_API}/forms/admin/adjust-points/${empId}/history/${historyId}`,
              { method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deleteReason, autoPoints: editPtsEmp?.autoPoints || 0 }) });
            if (res.ok) {
              setNotifySnack(`✓ Adjustment deleted for ${editPtsEmp?.empName}`);
              fetch(`${EMP_API}/forms/admin/adjustment-history/${empId}`)
                .then(r => r.ok ? r.json() : []).then(setAdjHistory).catch(() => {});
              load();
            } else {
              const d = await res.json();
              setNotifySnack(`Error: ${d.message}`);
            }
          } catch { setNotifySnack('Failed to delete adjustment.'); }
        }}
      />
      {/* Settled Duplicates Dialog */}
      <Dialog open={settledOpen} onClose={() => setSettledOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: BRAND.primary, fontWeight: 800 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            ✓ Settled Duplicate Records ({settledCount})
          </Box>
          <IconButton onClick={() => setSettledOpen(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          {duplicates.filter(d => d.settled).length === 0
            ? <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No settled duplicates yet.</Typography>
            : duplicates.filter(d => d.settled).map((dup, i) => (
              <Card key={i} sx={{ mb: 2, border: `1.5px solid ${BRAND.primaryLight || '#c8e6c9'}`, borderRadius: 2 }}>
                <CardContent sx={{ pb: '12px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip label="✓ Settled" size="small" sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700 }} />
                    <Typography fontWeight={800} sx={{ color: BRAND.primary }}>{dup.customerNames[0] || dup._id.customerNumber}</Typography>
                    <Typography variant="caption" color="text.secondary">({dup._id.customerNumber})</Typography>
                    <ProductChip product={dup._id.formFillingFor} />
                    <Chip label={`${dup.count} submissions`} size="small" sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700 }} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    {dup.employees.map((emp, j) => (
                      <Chip key={j} avatar={<Avatar sx={{ bgcolor: '#888', fontSize: 11 }}>{initials(emp)}</Avatar>}
                        label={emp} size="small" sx={{ fontWeight: 600 }} />
                    ))}
                  </Box>
                  {dup.settlementInfo && (
                    <Box sx={{ bgcolor: '#f9fffe', borderRadius: 1.5, p: 1.5, border: '1px solid #c8e6c9' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Settled on {new Date(dup.settlementInfo.settledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                      {dup.settlementInfo.note && (
                        <Typography variant="caption" sx={{ color: BRAND.primary, fontWeight: 600, display: 'block', mt: 0.5 }}>
                          Note: {dup.settlementInfo.note}
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))
          }
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettledOpen(false)} sx={{ color: BRAND.primary, fontWeight: 700 }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!notifySnack} autoHideDuration={4000} onClose={() => setNotifySnack('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notifySnack.startsWith('✓') ? 'success' : 'error'} variant="filled"
          onClose={() => setNotifySnack('')}>
          {notifySnack}
        </Alert>
      </Snackbar>
      </>)}
    </Box>
  );
}
