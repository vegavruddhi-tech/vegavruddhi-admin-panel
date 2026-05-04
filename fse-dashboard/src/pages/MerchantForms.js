import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, CircularProgress,
  Alert, Tooltip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar, Tabs, Tab, Badge, TextField,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Collapse, Menu, MenuItem, ListItemIcon, ListItemText,
  Snackbar,
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
import MeetingScheduler   from './Meetings';

// ── SlabTierRow: name + forms + multiplier all in one row ──
const SlabTierRow = React.memo(function SlabTierRow({ tier, idx, onCommit, onDelete }) {
  const [name, setName]             = useState(tier.name ?? '');
  const [forms, setForms]           = useState(tier.forms === '' || tier.forms == null ? '' : String(tier.forms));
  const [multiplier, setMultiplier] = useState(tier.multiplier === '' || tier.multiplier == null ? '' : String(tier.multiplier));
  const [reason, setReason]         = useState(tier.reason ?? '');

  useEffect(() => {
    setName(tier.name ?? '');
    setForms(tier.forms === '' || tier.forms == null ? '' : String(tier.forms));
    setMultiplier(tier.multiplier === '' || tier.multiplier == null ? '' : String(tier.multiplier));
    setReason(tier.reason ?? '');
  }, [tier.name, tier.forms, tier.multiplier, tier.reason]);
  const fNum = parseFloat(forms) || 0;
  const mNum = parseFloat(multiplier) || 0;
  const pts  = Math.round(fNum * mNum * 10) / 10;

  const handleFormsChange = useCallback((raw) => {
    setForms(raw);
    const v = parseFloat(raw);
    if (!isNaN(v)) {
      const m = parseFloat(multiplier) || 0;
      onCommit(idx, name, v, m, reason);
    }
  }, [idx, name, multiplier, reason, onCommit]);

  const handleMultiplierChange = useCallback((raw) => {
    setMultiplier(raw);
    const v = parseFloat(raw);
    if (!isNaN(v)) {
      const f = parseFloat(forms) || 0;
      onCommit(idx, name, f, v, reason);
    }
  }, [idx, name, forms, reason, onCommit]);

  return (
    <Box sx={{ mb: 1.5, p: 1, bgcolor: '#f1f8e9', borderRadius: 1, border: '1px solid #aed581' }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
        <TextField
          size="small" label="Slab Name"
          value={name}
          onChange={(e) => { setName(e.target.value); onCommit(idx, e.target.value, fNum, mNum, reason); }}
          sx={{ width: 110 }}
          placeholder="e.g. Slab 1"
        />
        <TextField
          size="small" type="number" label="Forms"
          value={forms}
          onChange={(e) => handleFormsChange(e.target.value)}
          sx={{ width: 90 }} inputProps={{ min: 0, step: 1 }}
        />
        <Typography variant="body2" sx={{ color: '#1565c0' }}>×</Typography>
        <TextField
          size="small" type="number" label="Multiplier"
          value={multiplier}
          onChange={(e) => handleMultiplierChange(e.target.value)}
          sx={{ width: 100 }} inputProps={{ min: 0, step: 0.1 }}
        />
        <Typography variant="body2" sx={{ color: '#1565c0', fontWeight: 700, minWidth: 60 }}>
          = {pts} pts
        </Typography>
      </Box>
      <TextField
        fullWidth size="small"
        label="Reason *"
        placeholder="Why are you adding/changing this slab?"
        value={reason}
        onChange={(e) => { setReason(e.target.value); onCommit(idx, name, fNum, mNum, e.target.value); }}
        sx={{ '& .MuiOutlinedInput-root': { fontSize: 12 } }}
      />
    </Box>
  );
});

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
function DuplicatePanel({ duplicates, open, onClose, onNotify, notifying, onSettle, settling }) {
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
                      <Chip key={j} avatar={<Avatar sx={{ bgcolor: dup.settled ? '#888' : BRAND.primary, fontSize: 11 }}>{initials(emp)}</Avatar>}
                        label={emp} size="small" sx={{ fontWeight: 600 }} />
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

// ── Verification Detail Modal ─────────────────────────────────
function VerificationDetailModal({ open, onClose, form, verifyData, loading }) {
  if (!form) return null;

  const getProduct = (f) => (f?.formFillingFor || f?.tideProduct || f?.brand || '').toLowerCase().trim();
  const product = getProduct(form);

  // Extract verification data (backend returns { verification, phoneCheck })
  const verification = verifyData?.verification || verifyData;
  const phoneCheck = verifyData?.phoneCheck;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        bgcolor: BRAND.primary, 
        color: '#fff',
        fontWeight: 800,
        pb: 1 
      }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Verification Details</Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            {form.customerName} · {form.customerNumber}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} sx={{ color: BRAND.primary }} />
          </Box>
        ) : !verification ? (
          <Alert severity="error">Failed to load verification details</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Merchant Info */}
            <Card sx={{ bgcolor: '#f9fffe', border: '1px solid #e0e0e0' }}>
              <CardContent>
                <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: 10 }}>
                  Merchant Information
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Name</Typography>
                    <Typography variant="body2" fontWeight={600}>{form.customerName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Phone</Typography>
                    <Typography variant="body2" fontWeight={600}>{form.customerNumber}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Product</Typography>
                    <ProductChip product={product} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Location</Typography>
                    <Typography variant="body2" fontWeight={600}>{form.location || '–'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">FSE</Typography>
                    <Typography variant="body2" fontWeight={600}>{form.employeeName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Submitted</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {form.createdAt ? new Date(form.createdAt).toLocaleDateString('en-IN', { 
                        day: 'numeric', month: 'short', year: 'numeric' 
                      }) : '–'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Verification Status */}
            <Card sx={{ 
              bgcolor: verification.status === 'Fully Verified' ? '#e6f4ea' : 
                       verification.status === 'Partially Done' ? '#fff8e1' : '#fdecea',
              border: `2px solid ${
                verification.status === 'Fully Verified' ? '#2e7d32' : 
                verification.status === 'Partially Done' ? '#f57f17' : '#c62828'
              }`
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="overline" sx={{ fontSize: 10 }}>
                    Verification Status
                  </Typography>
                  <VerifyChip status={verification.status} />
                </Box>
                
                {verification.passed !== undefined && verification.total !== undefined && (
                  <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
                    {verification.passed} of {verification.total} checks passed
                  </Typography>
                )}
                
                {verification.checks && verification.checks.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {verification.checks.map((check, idx) => (
                      <Box key={idx} sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        p: 1,
                        bgcolor: check.pass ? '#e6f4ea' : '#fdecea',
                        borderRadius: 1,
                        border: `1px solid ${check.pass ? '#2e7d32' : '#c62828'}30`
                      }}>
                        <Box sx={{ 
                          width: 24, 
                          height: 24, 
                          borderRadius: '50%', 
                          bgcolor: check.pass ? '#2e7d32' : '#c62828',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 14
                        }}>
                          {check.pass ? '✓' : '✗'}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {check.label}
                          </Typography>
                          {check.actual && (
                            <Typography variant="caption" color="text.secondary">
                              Value: {check.actual}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Alert severity="info">
                    {verification.status === 'Not Found' 
                      ? 'No matching record found in verification database'
                      : 'No verification checks configured for this product'}
                  </Alert>
                )}

                {/* Collection info */}
                {verification.collection && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                    Data source: {verification.collection} ({verification.matchType || 'exact'} match)
                  </Typography>
                )}

                {/* Manual verification info */}
                {verification.manualVerification && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    ✓ Manually verified by {verification.verifiedBy} on{' '}
                    {new Date(verification.verifiedAt).toLocaleDateString('en-IN')}
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Phone Check */}
            {phoneCheck && (
              <Card sx={{ bgcolor: '#f9fffe', border: '1px solid #e0e0e0' }}>
                <CardContent>
                  <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: 10 }}>
                    Phone Number Cross-Check
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip 
                      label={phoneCheck.matched ? '✓ Phone Found' : '✗ Phone Not Found'}
                      size="small"
                      sx={{ 
                        bgcolor: phoneCheck.matched ? '#e6f4ea' : '#fdecea',
                        color: phoneCheck.matched ? '#2e7d32' : '#c62828',
                        fontWeight: 700
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} sx={{ color: BRAND.primary, fontWeight: 700 }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Employee Group Row ────────────────────────────────────────
function EmployeeGroup({ empName, forms, duplicatePhones, empPointsData, empData, tlData, filterProduct, setFilterProduct, onEditPoints, onManualVerify, onRevertVerification, onReload, globalVerifyMap: parentVerifyMap }) {

  // ✅ FIXED: Use same priority order as backend (formFillingFor first)
  const getProduct = (f) =>
    (f?.formFillingFor || f?.tideProduct || f?.brand || '').toLowerCase().trim();

  // ✅ FIXED: unique key
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

  // ✅ FIXED: Check duplicates by phone+product combination, not just phone
  const dupCount = forms.filter(f => {
    const product = getProduct(f);
    const key = product ? `${f.customerNumber}__${product}` : f.customerNumber;
    return duplicatePhones.has(key);
  }).length;

  // ✅ FIXED: consistent product usage
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
        encodeURIComponent(
          new Date(f.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' })
        )
      ).join(',');

      const res = await fetch(
        `${EMP_API}/verify/bulk-admin?phones=${encodeURIComponent(phones)}&names=${names}&products=${products}&months=${months}`
      );

      if (res.ok) {
        const data = await res.json();
        setLocalVerifyMap(data);
      }

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

  // ✅ FIXED: Count ALL verified forms directly (no deduplication)
  const autoPoints = (() => {
    let sum = 0;
    
    // Count each form that is verified
    forms.forEach(form => {
      const formKey = getKey(form);
      const verificationStatus = verifyMap[formKey]?.status;
      
      // Only count if this specific form is Fully Verified
      if (verificationStatus === 'Fully Verified') {
        const product = getProduct(form); // lowercase
        const pointsKey = Object.keys(POINTS_MAP).find(k => k.toLowerCase().trim() === product);
        sum += pointsKey ? POINTS_MAP[pointsKey] : 0;
      }
    });
    
    return Math.round(sum * 10) / 10;
  })();

  // ✅ Calculate slab-based points if slabs exist
  const slabPoints = (() => {
    if (!empPointsData) {
      console.log(`[${empName}] ❌ No empPointsData at all`);
      return 0;
    }
    
    if (!empPointsData.productSlabs) {
      console.log(`[${empName}] ℹ️ No productSlabs in empPointsData (using automatic points)`);
      return 0;
    }
    
    let sum = 0;
    const slabsData = empPointsData.productSlabs;  // Already a plain object
    
    console.log(`[${empName}] 📊 Processing slabs:`, JSON.stringify(slabsData, null, 2));
    
    Object.entries(slabsData).forEach(([product, ps]) => {
      // New tier format: { slabTiers: [{name, forms, multiplier}] }
      if (ps?.slabTiers && Array.isArray(ps.slabTiers)) {
        ps.slabTiers.forEach(t => {
          const points = (parseFloat(t.forms) || 0) * (parseFloat(t.multiplier) || 0);
          sum += points;
        });
      // Legacy flat array format: [{forms, multiplier}]
      } else if (Array.isArray(ps)) {
        ps.forEach(slab => {
          sum += (slab.forms || 0) * (slab.multiplier || 0);
        });
      }
    });
    
    console.log(`[${empName}] 💰 Total slab points: ${sum}`);
    return Math.round(sum * 10) / 10;
  })();

  // ✅ Use slab points if they exist, otherwise use automatic points
  const hasSlabs = empPointsData?.productSlabs && Object.keys(empPointsData.productSlabs).length > 0;
  
  console.log(`[${empName}] hasSlabs: ${hasSlabs}, slabPoints: ${slabPoints}, autoPoints: ${autoPoints}`);
  
  const adjustment  = empPointsData?.pointsAdjustment || 0;
  // ✅ FIXED: Always use autoPoints calculated from filtered forms, never fall back to database total
  // This ensures points match the selected month filter
  const basePoints  = autoPoints;
  // Slab points are a BONUS on top of automatic points
  const verified    = Math.round((basePoints + (hasSlabs ? slabPoints : 0)) * 10) / 10;
  const totalPoints = Math.round((verified + adjustment) * 10) / 10;
  
  console.log(`[${empName}] Final: verified=${verified}, adjustment=${adjustment}, total=${totalPoints}`);

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
      }
    } catch (err) {
      setEditSnack(`Failed to delete: ${err.message}`);
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography fontWeight={700}>{empName}</Typography>
              {empData?.newJoinerPhone && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  · {empData.newJoinerPhone}
                </Typography>
              )}
            </Box>
            <Typography variant="caption" sx={{ display: 'block' }}>
              {forms.length} merchants
            </Typography>
            {tlData && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                TL: {tlData.name} · {tlData.phone}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            label={`⭐ ${totalPoints}${hasSlabs ? ' (Custom)' : ''}`}
            onClick={e => {
              e.stopPropagation();
              
              // Build per-product verified breakdown (count ALL verified forms directly)
              const productBreakdown = {};
              
              // Count each form that is verified (don't rely on verifyMap keys)
              forms.forEach(form => {
                const formKey = getKey(form);
                const verificationStatus = verifyMap[formKey]?.status;
                
                // Only count if this specific form is Fully Verified
                if (verificationStatus === 'Fully Verified') {
                  // ✅ FIXED: Use same priority order as backend
                  const rawProduct = form.formFillingFor || form.tideProduct || form.brand || 'Other';
                  const product = rawProduct.toLowerCase() === 'msme' ? 'Tide MSME' : rawProduct;
                  
                  // Count every verified form (no deduplication)
                  if (!productBreakdown[product]) productBreakdown[product] = 0;
                  productBreakdown[product]++;
                }
              });
              
              onEditPoints(empName, empPointsData, autoPoints, productBreakdown);
            }}
            sx={{ 
              cursor: 'pointer', 
              fontWeight: 700,
              bgcolor: hasSlabs ? '#e3f2fd' : undefined,
              color: hasSlabs ? '#1565c0' : undefined,
              border: hasSlabs ? '1px solid #1565c0' : undefined
            }}
          />
 
          {dupCount > 0 && (
            <Chip label={`${dupCount} dup`} color="error" />
          )}

          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
      </Box>

      {/* TABLE */}
      <Collapse in={expanded}>
        {/* Product Breakdown Chips */}
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#f9fffe', borderTop: '1px solid #e0e0e0', display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }} key={`chips-${Object.keys(verifyMap).length}`}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mr: 1 }}>
            Verified by Product:
          </Typography>
          {(() => {
            // Calculate product breakdown for this employee (count ALL verified forms directly)
            const productBreakdown = {};
            
            // Count each form that is verified
            forms.forEach(form => {
              const formKey = getKey(form);
              const verificationStatus = verifyMap[formKey]?.status;
              
              if (verificationStatus === 'Fully Verified') {
                // ✅ FIXED: Use same priority order as backend
                const rawProduct = form.formFillingFor || form.tideProduct || form.brand || 'Other';
                const product = rawProduct.toLowerCase() === 'msme' ? 'Tide MSME' : rawProduct;
                
                // Count every verified form (no deduplication)
                if (!productBreakdown[product]) productBreakdown[product] = 0;
                productBreakdown[product]++;
              }
            });
            
            // Sort by count descending
            const sorted = Object.entries(productBreakdown).sort((a, b) => b[1] - a[1]);
            
            if (sorted.length === 0) {
              return <Typography variant="caption" color="text.secondary">No verified forms yet</Typography>;
            }
            
            return sorted.map(([product, count]) => {
              const isSelected = filterProduct === product;
              return (
                <Chip
                  key={product}
                  label={`${product}: ${count} ✓`}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (setFilterProduct) {
                      setFilterProduct(isSelected ? '' : product);
                    }
                  }}
                  sx={{
                    bgcolor: isSelected ? '#2e7d32' : '#e6f4ea',
                    color: isSelected ? '#fff' : '#2e7d32',
                    fontWeight: 700,
                    fontSize: 11,
                    border: `1px solid ${isSelected ? '#2e7d32' : '#2e7d3230'}`,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: isSelected ? '#1b5e20' : '#c8e6c9',
                      transform: 'scale(1.05)'
                    },
                    transition: 'all 0.2s'
                  }}
                />
              );
            });
          })()}
        </Box>
        
        <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableBody>
            {forms
              .filter(f => {
                // Filter by selected product chip
                if (!filterProduct) return true; // Show all if no filter
                // ✅ FIXED: Use same priority order as backend
                const rawProduct = f.formFillingFor || f.tideProduct || f.brand || 'Other';
                const product = rawProduct.toLowerCase() === 'msme' ? 'Tide MSME' : rawProduct;
                return product === filterProduct;
              })
              .map(f => {
              // ✅ FIXED: Check duplicate by phone+product combination
              const product = getProduct(f);
              const dupKey = product ? `${f.customerNumber}__${product}` : f.customerNumber;
              const isDup = duplicatePhones.has(dupKey);
              const date  = f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–';

              return (
                <TableRow key={f._id}>

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
                      if (window.confirm(`Revert verification for ${editForm.customerName}?\n\nThis will change status back to "Not Found".`)) {
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
                      setEditForm(null);
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

      {/* Verification Detail Modal */}
      {verifyDetail && (
        <VerificationDetailModal
          open={!!verifyDetail}
          onClose={() => setVerifyDetail(null)}
          form={verifyDetail.form}
          verifyData={verifyDetail.data}
          loading={verifyDetail.loading}
        />
      )}

    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function MerchantForms() {
  const [forms,      setForms]      = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [dupOpen,    setDupOpen]    = useState(false);
  const [settledOpen,setSettledOpen]= useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [exportAnchor, setExportAnchor] = useState(null);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [notifying,  setNotifying]  = useState(null); // index of dup being notified
  const [notifySnack, setNotifySnack] = useState('');
  const [settling,   setSettling]   = useState(null); // index of dup being settled
  const [empPoints,  setEmpPoints]  = useState([]);   // [{_id, newJoinerName, pointsAdjustment}]
  const [editPtsOpen,  setEditPtsOpen]  = useState(false);
  const [editPtsEmp,   setEditPtsEmp]   = useState(null); // {empName, empData, autoPoints}
  const [editPtsValue, setEditPtsValue] = useState('');
  const [editPtsReason, setEditPtsReason] = useState('');
  const [deletingSlabKey, setDeletingSlabKey] = useState(null); // `${product}__${tidx}`
  const [deleteReason, setDeleteReason]       = useState('');
  const [deletingAdjKey, setDeletingAdjKey]   = useState(null); // historyId
  const [deleteAdjReason, setDeleteAdjReason] = useState('');
  const [editPtsSaving,setEditPtsSaving]= useState(false);
  const [productSlabs, setProductSlabs] = useState({}); // {productName: {slabTiers:[{name,multiplier}], assignments:[{tierIdx,forms,reason}]}}

  // ── Tier handlers ─────────────────────────────────────────────────────────
  const handleTierCommit = useCallback((product, idx, name, forms, multiplier, reason) => {
    setProductSlabs(prev => ({
      ...prev,
      [product]: {
        ...prev[product],
        slabTiers: prev[product].slabTiers.map((t, i) => i === idx ? { name, forms, multiplier, reason } : t)
      }
    }));
  }, []);

  const handleTierDelete = useCallback((product, idx) => {
    setProductSlabs(prev => {
      const tiers = prev[product].slabTiers.filter((_, i) => i !== idx);
      if (tiers.length === 0) { const n = { ...prev }; delete n[product]; return n; }
      return { ...prev, [product]: { slabTiers: tiers } };
    });
  }, []);

  const handleTierAdd = useCallback((product) => {
    setProductSlabs(prev => ({
      ...prev,
      [product]: {
        ...prev[product],
        slabTiers: [...(prev[product]?.slabTiers || []), { name: '', forms: '', multiplier: '' }]
      }
    }));
  }, []);

  // ── Assignment handlers — no longer needed (forms now in tier row) ────────
  const handleAssignCommit = useCallback(() => {}, []);
  const handleAssignDelete = useCallback(() => {}, []);
  const handleAssignAdd    = useCallback(() => {}, []);

  // ── Memoised slab handlers — prevent re-creating on every render ──────────
  const handleSlabFieldChange = useCallback((product, idx, forms, multiplier, reason) => {
    setProductSlabs(prev => ({
      ...prev,
      [product]: prev[product].map((s, i) =>
        i === idx ? { ...s, forms, multiplier, reason } : s
      )
    }));
  }, []);

  const handleSlabDelete = useCallback((product, idx) => {
    setProductSlabs(prev => {
      const updated = prev[product].filter((_, i) => i !== idx);
      if (updated.length === 0) { const n = { ...prev }; delete n[product]; return n; }
      return { ...prev, [product]: updated };
    });
  }, []);

  const handleSlabAdd = useCallback((product, totalCount) => {
    setProductSlabs(prev => ({
      ...prev,
      [product]: [...(prev[product] || []), { forms: totalCount, multiplier: 1.0, reason: '' }]
    }));
  }, []);

  const handleSlabRemoveAll = useCallback((product) => {
    setProductSlabs(prev => { const n = { ...prev }; delete n[product]; return n; });
  }, []);
  // ── Memoised total so it doesn't recalculate 3× per render ───────────────
  const editPtsVerifiedTotal = useMemo(() => {
    if (!editPtsEmp?.productBreakdown) return 0;
    return Object.entries(editPtsEmp.productBreakdown).reduce((sum, [product, count]) => {
      const pk = Object.keys(POINTS_MAP).find(k => k.toLowerCase().trim() === product.toLowerCase().trim());
      const auto = count * (pk ? POINTS_MAP[pk] : 0);
      const ps = productSlabs[product];
      const bonus = ps?.slabTiers?.length > 0
        ? ps.slabTiers.reduce((s, t) => s + ((t.forms ?? 0) * t.multiplier), 0)
        : Array.isArray(ps) && ps.length > 0 ? ps.reduce((s, sl) => s + (sl.forms * sl.multiplier), 0) : 0;
      return sum + auto + bonus;
    }, 0);
  }, [editPtsEmp, productSlabs]);

  // ── Breakdown: automatic vs slab bonus ────────────────────────────────────
  const editPtsAutoTotal = useMemo(() => {
    if (!editPtsEmp?.productBreakdown) return 0;
    return Object.entries(editPtsEmp.productBreakdown).reduce((sum, [product, count]) => {
      const pk = Object.keys(POINTS_MAP).find(k => k.toLowerCase().trim() === product.toLowerCase().trim());
      return sum + (count * (pk ? POINTS_MAP[pk] : 0));
    }, 0);
  }, [editPtsEmp]);

  const editPtsSlabBonus = useMemo(() => {
    if (!editPtsEmp?.productBreakdown) return 0;
    return Object.entries(editPtsEmp.productBreakdown).reduce((sum, [product]) => {
      const ps = productSlabs[product];
      const bonus = ps?.slabTiers?.length > 0
        ? ps.slabTiers.reduce((s, t) => s + ((t.forms ?? 0) * t.multiplier), 0)
        : Array.isArray(ps) && ps.length > 0 ? ps.reduce((s, sl) => s + (sl.forms * sl.multiplier), 0) : 0;
      return sum + bonus;
    }, 0);
  }, [editPtsEmp, productSlabs]);
  const [mainTab, setMainTab] = useState('forms'); // 'forms' or 'activity'
  const [pointsActivity, setPointsActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  // const [todayOnly, setTodayOnly] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [toDate, setToDate]         = useState('');
  const [fromDate, setFromDate]     = useState('');
  const [globalVerifyMap,  setGlobalVerifyMap]  = useState({});
  const [verifyKpiOpen,    setVerifyKpiOpen]    = useState(null); // 'Fully Verified' | 'Partially Done' | 'Not Found'
  const [drillProduct,     setDrillProduct]     = useState(null); // { product, status }
  const [filterProduct,    setFilterProduct]    = useState(''); // For product chip filtering
  const [selectedMonth,    setSelectedMonth]    = useState(new Date().toLocaleString('en-US', { month: 'long' })); // Default current month
  const [selectedYear,     setSelectedYear]     = useState(new Date().getFullYear()); // Default current year
  const [employees,        setEmployees]        = useState([]); // Employee data with phone and TL
  const [teamLeaders,      setTeamLeaders]      = useState([]); // TL data
  const [tls,              setTls]              = useState([]); // TL data for meetings

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [formsRes, dupRes, ptsRes, empRes, tlRes] = await Promise.all([
        fetch(`${EMP_API}/forms/admin/all`),
        fetch(`${EMP_API}/forms/admin/duplicates`),
        fetch(`${EMP_API}/forms/admin/employee-points`),
        fetch(`${EMP_API}/auth/all-employees`),
        fetch(`${EMP_API}/tl/approved-list`),
      ]);
      if (!formsRes.ok) throw new Error('Failed to load merchant forms');
      setForms(await formsRes.json());
      setDuplicates(dupRes.ok ? await dupRes.json() : []);
      setEmpPoints(ptsRes.ok ? await ptsRes.json() : []);
      setEmployees(empRes.ok ? await empRes.json() : []);
      const tlData = tlRes.ok ? await tlRes.json() : [];
      setTeamLeaders(tlData);
      setTls(tlData); // Also set for meetings component
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPointsActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await fetch(`${EMP_API}/points-activity/all?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setPointsActivity(data.activities || []);
      }
    } catch (err) {
      console.error('Error loading points activity:', err);
    } finally {
      setActivityLoading(false);
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
    console.log('🔧 handleEditPoints called:', { empName, empData: empData?._id, autoPoints, productBreakdown });
    
    // If no points record exists yet, create one first
    let data = empData;
    if (!data?._id) {
      console.log('📝 No EmployeePoints record exists, creating one...');
      try {
        const res = await fetch(`${EMP_API}/forms/admin/init-employee-points`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newJoinerName: empName })
        });
        if (res.ok) {
          data = await res.json();
          console.log('✅ Created EmployeePoints record:', data);
          // Refresh empPoints list
          const ptsRes = await fetch(`${EMP_API}/forms/admin/employee-points`);
          if (ptsRes.ok) setEmpPoints(await ptsRes.json());
        }
      } catch (err) {
        console.error('❌ Error creating EmployeePoints:', err);
      }
    }
    
    // ✅ Load ALL existing slabs from database (not just for products with verified forms)
    const initialSlabs = {};
    if (data?.productSlabs) {
      const slabsData = data.productSlabs;
      console.log('📊 Loading existing slabs from database:', JSON.stringify(slabsData, null, 2));

      Object.entries(slabsData).forEach(([product, val]) => {
        if (!val) return;
        // New tier format
        if (val.slabTiers && val.assignments) {
          // migrate old format that had separate assignments — flatten into tiers
          initialSlabs[product] = {
            slabTiers: val.slabTiers.map((t, i) => ({
              name: t.name,
              forms: val.assignments?.[i]?.forms ?? t.forms ?? 0,
              multiplier: t.multiplier
            }))
          };
          console.log(`✓ Loaded tier-based slabs for ${product}`);
        // New clean format
        } else if (val.slabTiers) {
          initialSlabs[product] = val;
          console.log(`✓ Loaded slabs for ${product}`);
        // Legacy flat array — migrate to new format on load
        } else if (Array.isArray(val) && val.length > 0) {
          initialSlabs[product] = {
            slabTiers: val.map((s, i) => ({ name: `Slab ${i + 1}`, forms: s.forms, multiplier: s.multiplier }))
          };
          console.log(`✓ Migrated legacy slabs for ${product}`);
        }
      });
      
      // Also ensure products with verified forms are in the breakdown
      Object.keys(initialSlabs).forEach(product => {
        if (!productBreakdown[product]) {
          productBreakdown[product] = 0; // Add with 0 count so it shows in the dialog
          console.log(`ℹ️ Added ${product} to breakdown with 0 count (has slabs but no verified forms)`);
        }
      });
    } else {
      console.log('ℹ️ No existing slabs found in database');
    }
    
    console.log('🎯 Opening edit points dialog with:', { 
      empName, 
      autoPoints, 
      productBreakdown, 
      initialSlabs,
      empDataId: data?._id
    });
    
    setEditPtsEmp({ empName, empData: data, autoPoints, productBreakdown });
    setEditPtsValue('0');
    setEditPtsReason('');
    setProductSlabs({});  // Always start blank — saved slabs shown in Adjustment History only
    setEditPtsOpen(true);
  }, []);

  const handleSavePoints = useCallback(async () => {
    if (!editPtsEmp?.empData?._id) return;
    setEditPtsSaving(true);
    try {
      const delta = parseFloat(editPtsValue) || 0;
      // Capture total BEFORE this save (auto + existing slab + existing manual adj)
      const preSaveTotal = Math.round((editPtsVerifiedTotal + (editPtsEmp.empData.pointsAdjustment || 0)) * 100) / 100;
      
      console.log('💾 Saving points:', { 
        empName: editPtsEmp.empName, 
        empDataId: editPtsEmp.empData._id,
        delta, 
        productSlabs: JSON.stringify(productSlabs, null, 2)
      });
      
      // ✅ Step 1: Save slabs with reasons to EmployeePoints
      const res = await fetch(`${EMP_API}/forms/admin/adjust-points/${editPtsEmp.empData._id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ 
          adjustment: delta,
          reason: editPtsReason || '',
          productSlabs: productSlabs
        }),
      });
      
      if (!res.ok) {
        const d = await res.json();
        console.error('❌ Error response from adjust-points:', d);
        setNotifySnack(`Error: ${d.message || 'Failed to update points'}`);
        setEditPtsSaving(false);
        return;
      }
      
      const savedData = await res.json();
      console.log('✅ Points saved successfully:', savedData);
      console.log('✅ Saved productSlabs:', JSON.stringify(savedData.doc?.productSlabs, null, 2));
      
      // ✅ Verify slabs were actually saved
      if (Object.keys(productSlabs).length > 0 && !savedData.doc?.productSlabs) {
        console.error('⚠️ WARNING: Slabs were sent but not returned in response!');
        setNotifySnack('⚠️ Points saved but slabs may not have persisted. Please check.');
        setEditPtsSaving(false);
        return;
      }
      
      // ✅ Step 2: Send one notification per slab (separate before/after for each)
      const activities = [];
      Object.entries(productSlabs).forEach(([product, ps]) => {
        if (ps?.slabTiers) {
          ps.slabTiers.forEach(t => {
            activities.push({
              product,
              slabDetails: { forms: t.forms ?? 0, multiplier: t.multiplier },
              reason: `${t.name || ''}${t.reason ? ': ' + t.reason : ''}`.trim(),
              actionType: 'added'
            });
          });
        } else if (Array.isArray(ps)) {
          ps.forEach(slab => {
            activities.push({
              product,
              slabDetails: { forms: slab.forms, multiplier: slab.multiplier },
              reason: slab.reason || '',
              actionType: 'added'
            });
          });
        }
      });

      if (activities.length > 0) {
        // Send each slab as a separate notification with correct before/after
        let runningTotal = preSaveTotal;
        for (const activity of activities) {
          const slabPts = Math.round(
            (parseFloat(activity.slabDetails.forms) || 0) *
            (parseFloat(activity.slabDetails.multiplier) || 0) * 100
          ) / 100;
          await fetch(`${EMP_API}/points-activity/bulk-create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employeeName: editPtsEmp.empName,
              employeeId:   editPtsEmp.empData.employeeId || null,
              preSaveTotal: runningTotal,
              activities:   [activity]
            })
          });
          runningTotal = Math.round((runningTotal + slabPts) * 100) / 100;
        }
        setNotifySnack(`✓ Points updated for ${editPtsEmp.empName}. ${activities.length} notification(s) sent.`);
      } else {
        setNotifySnack(`✓ Points updated for ${editPtsEmp.empName}.`);
      }
      
      // ✅ Close dialog BEFORE reload to prevent stale data display
      setEditPtsOpen(false);
      setProductSlabs({});
      setEditPtsEmp(null);
      setEditPtsValue('');
      setEditPtsReason('');
      setDeletingSlabKey(null);
      setDeleteReason('');
      setDeletingAdjKey(null);
      setDeleteAdjReason('');
      
      // ✅ Step 3: Force complete reload with cache bypass
      console.log('🔄 Reloading employee points data...');
      const ptsRes = await fetch(`${EMP_API}/forms/admin/employee-points?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      
      if (ptsRes.ok) {
        const freshData = await ptsRes.json();
        console.log('📊 Fresh employee points data loaded, count:', freshData.length);
        
        // Find the updated employee's data
        const updatedEmp = freshData.find(e => e._id === editPtsEmp.empData._id);
        if (updatedEmp) {
          console.log('✅ Updated employee data:', {
            name: updatedEmp.newJoinerName,
            productSlabs: JSON.stringify(updatedEmp.productSlabs, null, 2)
          });
        } else {
          console.warn('⚠️ Could not find updated employee in fresh data');
        }
        
        setEmpPoints(freshData);
      } else {
        console.error('❌ Failed to reload employee points');
      }
      
      // ✅ Reload forms data
      await load();
      
      console.log('✅ All data reloaded successfully');
      
    } catch (err) {
      console.error('❌ Error saving points:', err);
      setNotifySnack(`Failed to update points: ${err.message}`);
    } finally {
      setEditPtsSaving(false);
    }
  }, [editPtsEmp, editPtsValue, editPtsReason, productSlabs, load]);

  const handleManualVerify = useCallback(async (form) => {
    // Open manual verification dialog or directly create
    const product = form.formFillingFor || form.tideProduct || form.brand || '';
    const month = form.createdAt 
      ? new Date(form.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' })
      : '';
    
    if (!window.confirm(`Manually verify ${form.customerName} (${form.customerNumber}) for ${product}?`)) return;
    
    try {
      const res = await fetch(`${EMP_API}/manual-verification/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: form.customerNumber,
          product: product,
          month: month,
          status: 'Fully Verified',
          verifiedBy: 'Admin',
          reason: 'Manual verification by admin',
          formId: form._id
        })
      });
      
      if (res.ok) {
        setNotifySnack('✓ Form manually verified successfully');
        load(); // Reload to refresh verification status
      } else {
        const data = await res.json();
        setNotifySnack(`Error: ${data.message}`);
      }
    } catch (err) {
      setNotifySnack('Failed to verify form. Please try again.');
    }
  }, [load]);

  const handleRevertVerification = useCallback(async (form) => {
    // This would delete the manual verification record
    const product = form.formFillingFor || form.tideProduct || form.brand || '';
    
    try {
      const res = await fetch(`${EMP_API}/manual-verification/list?phone=${form.customerNumber}&product=${product}`);
      if (res.ok) {
        const data = await res.json();
        if (data.verifications && data.verifications.length > 0) {
          const verification = data.verifications[0];
          const deleteRes = await fetch(`${EMP_API}/manual-verification/${verification._id}`, {
            method: 'DELETE'
          });
          
          if (deleteRes.ok) {
            setNotifySnack('✓ Verification reverted successfully');
            load();
          } else {
            setNotifySnack('Error reverting verification');
          }
        }
      }
    } catch (err) {
      setNotifySnack('Failed to revert verification');
    }
  }, [load]);

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

  // Set of phone+product combinations that are cross-employee duplicates
  const duplicatePhones = useMemo(() => {
    const s = new Set();
    duplicates.forEach(d => {
      const phone = d._id.customerNumber;
      const product = (d._id.formFillingFor || '').toLowerCase().trim();
      // Store as "phone__product" to match the key format used elsewhere
      s.add(product ? `${phone}__${product}` : phone);
    });
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
    // Date filter
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

    // Month/Year filter
    if (selectedYear || selectedMonth) {
      const formDate = new Date(f.createdAt);
      const formYear = formDate.getFullYear();
      const formMonth = formDate.toLocaleString('en-US', { month: 'long' });
      
      if (selectedYear && formYear !== selectedYear) return false;
      if (selectedMonth && formMonth !== selectedMonth) return false;
    }

    // Search filter
    return (
      !q ||
      (f.customerName   || '').toLowerCase().includes(q) ||
      (f.customerNumber || '').includes(q) ||
      (f.employeeName   || '').toLowerCase().includes(q) ||
      (f.location       || '').toLowerCase().includes(q)
    );
  });
  const map = {};
  filtered.forEach(f => {
    const key = f.employeeName || 'Unknown';
    if (!map[key]) map[key] = [];
    map[key].push(f);
  });
  return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
}, [forms, search, dateFilter, fromDate, toDate, selectedMonth, selectedYear]);



  const totalDupCount = duplicates.length;
  const settledCount  = duplicates.filter(d => d.settled).length;
  const activeCount   = totalDupCount - settledCount;

  // Map empName → points data
  const empPointsMap = useMemo(() => {
    const m = {};
    empPoints.forEach(e => {
      const key = (e.newJoinerName || '').trim();
      const existing = m[key];
      const hasSlabs = e.productSlabs && Object.keys(e.productSlabs).length > 0;
      const existingHasSlabs = existing?.productSlabs && Object.keys(existing.productSlabs).length > 0;
      if (!existing || (hasSlabs && !existingHasSlabs)) {
        m[key] = e;
      }
    });
    return m;
  }, [empPoints]);

  // Map empName → employee data (phone, TL, etc.)
  const empDataMap = useMemo(() => {
    const m = {};
    employees.forEach(e => { m[e.newJoinerName] = e; });
    return m;
  }, [employees]);

  // Map TL name → TL data (phone, email, etc.)
  const tlDataMap = useMemo(() => {
    const m = {};
    teamLeaders.forEach(tl => { m[tl.name.toLowerCase().trim()] = tl; });
    return m;
  }, [teamLeaders]);

  // Fetch global verification for all filtered forms
  // ✅ FIXED: Use same priority order as backend (formFillingFor first)
  const getFormProduct = (f) => (f?.formFillingFor || f?.tideProduct || f?.brand || '').toLowerCase().trim();
  const getFormKey     = (f) => { const p = getFormProduct(f); return p ? `${f.customerNumber}__${p}` : f.customerNumber; };

  useEffect(() => {
  // ✅ OPTIMIZED: Fetch verification ONCE on page load based on ALL forms, not filtered forms
  // This prevents re-fetching when user types in search or changes filters
  // ✅ CACHED: Uses localStorage to cache verification data for the day (reduces API calls by 90%)
  if (!forms.length) { setGlobalVerifyMap({}); return; }

  // Generate cache key with today's date (auto-expires at midnight)
  const today = new Date().toISOString().split('T')[0]; // "2026-05-01"
  const cacheKey = `verification_cache_${today}`;

  // Check if we have cached data for TODAY
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      // Use cached data (0 API calls)
      const cachedData = JSON.parse(cached);
      setGlobalVerifyMap(cachedData);
      console.log('✅ Using cached verification data from localStorage');
      return;
    }
  } catch (err) {
    console.warn('Failed to read verification cache:', err);
    // Continue to fetch from API if cache read fails
  }

  // No cache - fetch from API (17 calls)
  console.log('📡 Fetching fresh verification data from API...');
  const BATCH = 50;
  const batches = [];
  for (let i = 0; i < forms.length; i += BATCH) {
    batches.push(forms.slice(i, i + BATCH));
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
    
    // Store in cache for today
    try {
      localStorage.setItem(cacheKey, JSON.stringify(merged));
      console.log('✅ Verification data cached in localStorage');
    } catch (err) {
      console.warn('Failed to cache verification data:', err);
      // Continue even if caching fails
    }
  });
}, [forms]); // ✅ Changed from [grouped] to [forms] - only fetch once on page load

  // ✅ CLEANUP: Remove old verification cache entries (runs once on mount)
  useEffect(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentCacheKey = `verification_cache_${today}`;
      
      // Find and remove old cache entries
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('verification_cache_') && key !== currentCacheKey) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed old cache: ${key}`);
      });
    } catch (err) {
      console.warn('Failed to cleanup old cache:', err);
    }
  }, []); // Run once on mount

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

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
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

          {/* Points Activity Button */}
          <Button
            variant="outlined"
            onClick={() => {
              setMainTab(mainTab === 'activity' ? 'forms' : 'activity');
              if (mainTab !== 'activity') loadPointsActivity();
            }}
            sx={{ 
              borderColor: BRAND.primary, 
              color: mainTab === 'activity' ? '#fff' : BRAND.primary,
              bgcolor: mainTab === 'activity' ? BRAND.primary : 'transparent',
              fontWeight: 700,
              '&:hover': { bgcolor: mainTab === 'activity' ? '#0f3320' : BRAND.primaryLight }
            }}
          >
            {mainTab === 'activity' ? '← Back to Forms' : '📊 Points Activity'}
          </Button>

          {/* Schedule Meeting Button */}
          <Button
            variant="outlined"
            startIcon={<span>📅</span>}
            onClick={() => setMeetingOpen(true)}
            sx={{ 
              borderColor: BRAND.primary, 
              color: BRAND.primary,
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: BRAND.primaryLight }
            }}
          >
            Schedule Meeting
          </Button>
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

      {/* Summary KPIs */}
      {(() => {
        const filteredForms = grouped.flatMap(([, empForms]) => empForms);
        const filteredTotal = filteredForms.length;
        const filteredEmps  = grouped.length;
        return (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
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
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
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
          <Typography variant="h6" fontWeight={800}>
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
                <Typography variant="h6" fontWeight={800}>
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {drillForms.map((f, i) => (
                      <TableRow key={f._id} hover>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 11 }}>{i + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{f.customerName}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{f.customerNumber}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{f.location}</TableCell>
                        <TableCell>
                          <Chip label={f.employeeName || '–'} size="small"
                            avatar={<Avatar sx={{ bgcolor: BRAND.primary, fontSize: 10 }}>{initials(f.employeeName)}</Avatar>}
                            sx={{ fontWeight: 600, fontSize: 11 }} />
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 11 }}>
                          {f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'}
                        </TableCell>
                      </TableRow>
                    ))}
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
      {/* Date Filter */}
<Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
  {['all', 'today', 'week'].map(f => (
    <Button key={f} size="small"
      variant={dateFilter === f ? 'contained' : 'outlined'}
      onClick={() => { setDateFilter(f); setFromDate(''); setToDate(''); }}
      sx={{ fontWeight: 700, textTransform: 'capitalize',
        bgcolor: dateFilter === f ? BRAND.primary : 'transparent',
        borderColor: BRAND.primary, color: dateFilter === f ? '#fff' : BRAND.primary,
        '&:hover': { bgcolor: dateFilter === f ? '#0f3320' : BRAND.primaryLight }
      }}>
      {f === 'all' ? 'All' : f === 'today' ? 'Today' : 'This Week'}
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



      {/* Search and Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField 
          fullWidth 
          size="small" 
          placeholder="Search by merchant name, phone, employee or location…"
          value={search} 
          onChange={e => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 300 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment> }} 
        />
        
        {/* Year Filter */}
        <TextField
          select
          size="small"
          label="Year"
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          {(() => {
            const currentYear = new Date().getFullYear();
            const years = [];
            for (let y = currentYear; y >= currentYear - 5; y--) {
              years.push(y);
            }
            return years.map(year => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ));
          })()}
        </TextField>

        {/* Month Filter */}
        <TextField
          select
          size="small"
          label="Month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">All Months</MenuItem>
          <MenuItem value="January">January</MenuItem>
          <MenuItem value="February">February</MenuItem>
          <MenuItem value="March">March</MenuItem>
          <MenuItem value="April">April</MenuItem>
          <MenuItem value="May">May</MenuItem>
          <MenuItem value="June">June</MenuItem>
          <MenuItem value="July">July</MenuItem>
          <MenuItem value="August">August</MenuItem>
          <MenuItem value="September">September</MenuItem>
          <MenuItem value="October">October</MenuItem>
          <MenuItem value="November">November</MenuItem>
          <MenuItem value="December">December</MenuItem>
        </TextField>

        {/* Reset Button */}
        <Button 
          variant="outlined" 
          size="small"
          onClick={() => {
            setSearch('');
            setSelectedMonth('');
            setSelectedYear(new Date().getFullYear());
            setFilterProduct('');
          }}
          sx={{ 
            color: BRAND.primary, 
            borderColor: BRAND.primary,
            '&:hover': { bgcolor: '#e6f4ea' }
          }}
        >
          Reset
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} action={<Button size="small" onClick={load}>Retry</Button>}>{error}</Alert>}

      {/* Forms List - Only show when mainTab is 'forms' */}
      {mainTab === 'forms' && (
        <>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: BRAND.primary }} />
            </Box>
          ) : grouped.length === 0 ? (
            <Card sx={{ textAlign: 'center', py: 6, border: `1.5px dashed ${BRAND.primaryLight}` }}>
              <Typography color="text.secondary">No merchant forms found.</Typography>
            </Card>
          ) : (
            grouped.map(([empName, empForms]) => (
              <EmployeeGroup 
                key={empName} 
                empName={empName} 
                forms={empForms}
                duplicatePhones={duplicatePhones}
                empPointsData={empPointsMap[empName.trim()]}
                empData={empDataMap[empName]}
                tlData={tlDataMap[(empDataMap[empName]?.reportingManager || '').toLowerCase().trim()]}
                filterProduct={filterProduct}
                setFilterProduct={setFilterProduct}
                onEditPoints={handleEditPoints}
                onManualVerify={handleManualVerify}
                onRevertVerification={handleRevertVerification}
                onReload={load}
                globalVerifyMap={globalVerifyMap}
              />
            ))
          )}
        </>
      )}

      <DuplicatePanel duplicates={duplicates} open={dupOpen} onClose={() => setDupOpen(false)}
        onNotify={handleNotify} notifying={notifying}
        onSettle={handleSettle} settling={settling} />
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
      <Dialog open={editPtsOpen} onClose={() => { setEditPtsOpen(false); setProductSlabs({}); setEditPtsEmp(null); setEditPtsValue(''); setEditPtsReason(''); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: BRAND.primary, pb: 1 }}>
          ⭐ Edit Points — {editPtsEmp?.empName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#fff8e1', borderRadius: 2, border: '1px solid #f4a261' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Points criteria (Fully Verified only):</Typography>
            {Object.entries(POINTS_MAP).map(([k, v]) => (
              <Typography key={k} variant="caption" sx={{ display: 'block', color: '#e76f51', fontWeight: 600 }}>
                {k}: {v} pts
              </Typography>
            ))}
          </Box>
          
          {/* Product Points - Automatic + Optional Slabs */}
          {editPtsEmp?.productBreakdown && Object.keys(editPtsEmp.productBreakdown).length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={700} sx={{ mb: 1.5, color: BRAND.primary }}>
                Product Points:
              </Typography>
              
              {Object.entries(editPtsEmp.productBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([product, totalCount]) => {
                  const ps = productSlabs[product];
                  const hasCustomSlabs = !!(ps?.slabTiers?.length > 0 || (Array.isArray(ps) && ps.length > 0));

                  // Calculate automatic points
                  const pointsKey = Object.keys(POINTS_MAP).find(k => k.toLowerCase().trim() === product.toLowerCase().trim());
                  const pointsPerItem = pointsKey ? POINTS_MAP[pointsKey] : 0;
                  const autoPoints = totalCount * pointsPerItem;

                  // Slab bonus (always ADDED on top of automatic)
                  const slabTotal = ps?.slabTiers?.length > 0
                    ? ps.slabTiers.reduce((sum, t) => sum + ((t.forms ?? 0) * t.multiplier), 0)
                    : Array.isArray(ps) ? ps.reduce((sum, s) => sum + (s.forms * s.multiplier), 0) : 0;

                  // Final = automatic + slab bonus
                  const finalPoints = autoPoints + slabTotal;
                  
                  return (
                    <Box key={product} sx={{ mb: 2, p: 1.5, bgcolor: '#e3f2fd', borderRadius: 2, border: '1px solid #1565c0' }}>
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#1565c0', mb: 1 }}>
                        {product} ({totalCount} verified forms)
                      </Typography>
                      
                      {/* Automatic Points */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, p: 1, bgcolor: '#fff', borderRadius: 1, border: '1px dashed #1565c0' }}>
                        <Typography variant="caption" sx={{ color: '#1565c0', fontWeight: 600 }}>
                          Automatic: {totalCount} × {pointsPerItem} = {Math.round(autoPoints * 10) / 10} pts
                        </Typography>
                        {hasCustomSlabs && slabTotal > 0 && (
                          <Chip 
                            label={`+ Bonus: ${Math.round(slabTotal * 10) / 10} pts`} 
                            size="small" 
                            sx={{ bgcolor: '#4caf50', color: '#fff', fontWeight: 700, fontSize: 10 }} 
                          />
                        )}
                      </Box>
                      
                      {/* Custom Slabs Section */}
                      {hasCustomSlabs ? (
                        <Box sx={{ mb: 1 }}>
                          <Box sx={{ mb: 1, p: 1, bgcolor: '#e8f5e9', borderRadius: 1, border: '1px solid #66bb6a' }}>
                            <Typography variant="caption" fontWeight={700} sx={{ display: 'block', color: '#2e7d32', mb: 0.5 }}>
                              Custom Slabs — Name · Forms · Multiplier:
                            </Typography>
                            {(productSlabs[product]?.slabTiers || []).map((tier, tidx) => (
                              <SlabTierRow
                                key={tidx}
                                tier={tier}
                                idx={tidx}
                                onCommit={(i, name, forms, mult, reason) => handleTierCommit(product, i, name, forms, mult, reason)}
                                onDelete={(i) => handleTierDelete(product, i)}
                              />
                            ))}
                            <Button size="small" onClick={() => handleTierAdd(product)}
                              sx={{ color: '#2e7d32', fontWeight: 600, fontSize: 11, mt: 0.5 }}>
                              + Add Slab
                            </Button>
                          </Box>
                          <Button size="small" onClick={() => handleSlabRemoveAll(product)}
                            sx={{ color: '#c62828', fontWeight: 600, fontSize: 11 }}>
                            ✗ Remove All Slabs (Use Automatic)
                          </Button>
                        </Box>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setProductSlabs(prev => ({
                              ...prev,
                              [product]: {
                                slabTiers: [{ name: '', forms: '', multiplier: '' }]
                              }
                            }));                          }}
                          sx={{ color: '#1565c0', borderColor: '#1565c0', fontWeight: 600, fontSize: 11, mt: 0.5 }}
                        >
                          + ADD CUSTOM SLABS
                        </Button>
                      )}
                      
                      <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #1565c030' }}>
                        <Typography variant="caption" fontWeight={700} sx={{ color: '#1565c0' }}>
                          Subtotal: {Math.round(autoPoints * 10) / 10}{hasCustomSlabs && slabTotal > 0 ? ` + ${Math.round(slabTotal * 10) / 10}` : ''} = {Math.round(finalPoints * 10) / 10} pts
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              
              <Box sx={{ p: 1.5, bgcolor: '#e6f4ea', borderRadius: 2, border: '1px solid ' + BRAND.primary }}>
                <Typography variant="body2" fontWeight={700} sx={{ color: BRAND.primary }}>
                  Total Verified Points:{' '}
                  {Math.round(editPtsAutoTotal * 10) / 10}
                  {editPtsSlabBonus > 0 && <> + <span style={{ color: '#2e7d32' }}>{Math.round(editPtsSlabBonus * 10) / 10}</span></>}
                  {' '}= {Math.round(editPtsVerifiedTotal * 10) / 10} pts
                </Typography>
              </Box>
            </Box>
          )}
          
          {/* ── Adjustment History ── */}
          {(() => {
            const savedSlabs = editPtsEmp?.empData?.productSlabs;
            if (!savedSlabs) return null;
            const entries = [];
            Object.entries(savedSlabs).forEach(([product, ps]) => {
              const tiers = ps?.slabTiers || (Array.isArray(ps) ? ps.map((s, i) => ({ name: `Slab ${i+1}`, forms: s.forms, multiplier: s.multiplier, reason: s.reason || '' })) : []);
              tiers.forEach((t, tidx) => {
                const pts = Math.round((t.forms ?? 0) * (t.multiplier ?? 0) * 10) / 10;
                entries.push({ product, tidx, tier: t, pts });
              });
            });
            if (entries.length === 0) return null;
            return (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight={700} sx={{ mb: 1, color: BRAND.primary }}>
                  Adjustment History
                </Typography>
                {entries.map(({ product, tidx, tier, pts }, i) => {
                  const key = `${product}__${tidx}`;
                  const isDeleting = deletingSlabKey === key;
                  return (
                    <Box key={i} sx={{ mb: 0.8, bgcolor: '#f9fbe7', borderRadius: 2, border: `1px solid ${isDeleting ? '#e53935' : '#c5e1a5'}`, overflow: 'hidden' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.2 }}>
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ color: '#2e7d32' }}>
                            +{pts} pts &nbsp;
                            <span style={{ fontWeight: 400, color: '#555' }}>
                              {product} — {tier.name || `Slab ${tidx + 1}`} ({tier.forms} × {tier.multiplier})
                            </span>
                          </Typography>
                          {tier.reason && (
                            <Typography variant="caption" sx={{ color: '#777' }}>{tier.reason}</Typography>
                          )}
                        </Box>
                        <IconButton size="small" sx={{ color: '#c62828' }}
                          onClick={() => { setDeletingSlabKey(key); setDeleteReason(''); }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      {isDeleting && (
                        <Box sx={{ px: 1.5, pb: 1.5, borderTop: '1px solid #ffcdd2', bgcolor: '#fff5f5' }}>
                          <Typography variant="caption" sx={{ color: '#c62828', fontWeight: 700, display: 'block', mb: 0.5, mt: 0.8 }}>
                            Reason for deletion *
                          </Typography>
                          <TextField
                            fullWidth size="small"
                            placeholder="Why are you deleting this slab?"
                            value={deleteReason}
                            onChange={e => setDeleteReason(e.target.value)}
                            sx={{ mb: 1, '& .MuiOutlinedInput-root': { fontSize: 12 } }}
                            autoFocus
                          />
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" variant="contained"
                              disabled={!deleteReason.trim()}
                              sx={{ bgcolor: '#c62828', fontSize: 11, fontWeight: 700, '&:hover': { bgcolor: '#b71c1c' } }}
                              onClick={async () => {
                                const pts = Math.round((parseFloat(tier.forms) || 0) * (parseFloat(tier.multiplier) || 0) * 100) / 100;
                                try {
                                  const res = await fetch(`${EMP_API}/forms/admin/delete-slab`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      empPointsId: editPtsEmp.empData._id,
                                      product, tierIdx: tidx,
                                      deleteReason: deleteReason.trim()
                                    })
                                  });
                                  if (!res.ok) { const d = await res.json(); setNotifySnack(`Error: ${d.message}`); return; }
                                } catch (err) { setNotifySnack(`Error: ${err.message}`); return; }

                                // ── Send FSE + TL notification directly via bulk-create ──
                                try {
                                  const fNum = parseFloat(tier.forms) || 0;
                                  const mNum = parseFloat(tier.multiplier) || 0;
                                  const deletedPts = Math.round(fNum * mNum * 100) / 100;
                                  await fetch(`${EMP_API}/points-activity/bulk-create`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      employeeName: editPtsEmp.empName,
                                      activities: [{
                                        product,
                                        slabDetails: { forms: fNum, multiplier: mNum },
                                        reason: `${tier.name || `Slab ${tidx + 1}`} DELETED — ${deleteReason.trim()}`,
                                        actionType: 'removed'
                                      }]
                                    })
                                  });
                                } catch (_) {}

                                setNotifySnack(`✓ Slab deleted. FSE & TL notified.`);
                                setDeletingSlabKey(null); setDeleteReason('');
                                setProductSlabs(prev => {
                                  const ps = prev[product] || editPtsEmp.empData.productSlabs[product];
                                  if (!ps?.slabTiers) return prev;
                                  const updated = ps.slabTiers.filter((_, i) => i !== tidx);
                                  if (updated.length === 0) { const n = { ...prev }; delete n[product]; return n; }
                                  return { ...prev, [product]: { slabTiers: updated } };
                                });
                                const saved = editPtsEmp.empData.productSlabs?.[product];
                                if (saved?.slabTiers) {
                                  const updated = saved.slabTiers.filter((_, i) => i !== tidx);
                                  setEditPtsEmp(prev => ({
                                    ...prev,
                                    empData: { ...prev.empData, productSlabs: { ...prev.empData.productSlabs, [product]: updated.length > 0 ? { slabTiers: updated } : undefined } }
                                  }));
                                }
                              }}>
                              Confirm Delete
                            </Button>
                            <Button size="small" onClick={() => { setDeletingSlabKey(null); setDeleteReason(''); }} sx={{ fontSize: 11 }}>
                              Cancel
                            </Button>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            );
          })()}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Manual Adjustment (+ or -):
          </Typography>
          <TextField fullWidth size="small" type="number" label="Manual Adjustment (+ or -)"
            value={editPtsValue}
            onChange={e => setEditPtsValue(e.target.value)}
            helperText="Added on top of verified points. Use negative to subtract."
            inputProps={{ step: 0.1 }} />
          <TextField fullWidth size="small" label="Reason for adjustment *"
            placeholder="Why are you adding/subtracting these points?"
            value={editPtsReason}
            onChange={e => setEditPtsReason(e.target.value)}
            sx={{ mt: 1.5, '& .MuiOutlinedInput-root': { fontSize: 13 } }} />

          {/* ── Manual Adjustment History ── */}
          {editPtsEmp?.empData?.adjustmentHistory?.filter(h => h.delta !== 0).length > 0 && (
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="body2" fontWeight={700} sx={{ mb: 1, color: BRAND.primary }}>
                Manual Adjustment History
              </Typography>
              {[...editPtsEmp.empData.adjustmentHistory].filter(h => h.delta !== 0).reverse().map((h, i) => {
                const hid = h._id?.toString() || String(i);
                const isDeleting = deletingAdjKey === hid;
                return (
                  <Box key={hid} sx={{ mb: 0.8, bgcolor: h.delta >= 0 ? '#f0fdf4' : '#fff5f5', borderRadius: 2, border: `1px solid ${isDeleting ? '#e53935' : (h.delta >= 0 ? '#c5e1a5' : '#ffcdd2')}`, overflow: 'hidden' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.2 }}>
                      <Box>
                        <Typography variant="body2" fontWeight={700} sx={{ color: h.delta >= 0 ? '#2e7d32' : '#c62828' }}>
                          {h.delta >= 0 ? '+' : ''}{h.delta} pts
                          {h.reason && <span style={{ fontWeight: 400, color: '#555', marginLeft: 8 }}>{h.reason}</span>}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#999' }}>
                          {new Date(h.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                      <IconButton size="small" sx={{ color: '#c62828' }}
                        onClick={() => { setDeletingAdjKey(hid); setDeleteAdjReason(''); }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    {isDeleting && (
                      <Box sx={{ px: 1.5, pb: 1.5, borderTop: '1px solid #ffcdd2', bgcolor: '#fff5f5' }}>
                        <Typography variant="caption" sx={{ color: '#c62828', fontWeight: 700, display: 'block', mb: 0.5, mt: 0.8 }}>
                          Reason for deletion *
                        </Typography>
                        <TextField fullWidth size="small"
                          placeholder="Why are you removing this adjustment?"
                          value={deleteAdjReason}
                          onChange={e => setDeleteAdjReason(e.target.value)}
                          sx={{ mb: 1, '& .MuiOutlinedInput-root': { fontSize: 12 } }}
                          autoFocus
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size="small" variant="contained"
                            disabled={!deleteAdjReason.trim()}
                            sx={{ bgcolor: '#c62828', fontSize: 11, fontWeight: 700, '&:hover': { bgcolor: '#b71c1c' } }}
                            onClick={async () => {
                              try {
                                const empId = editPtsEmp.empData.employeeId || editPtsEmp.empData._id;
                                const res = await fetch(`${EMP_API}/forms/admin/adjust-points/${empId}/history/${hid}`, {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ deleteReason: deleteAdjReason.trim() })
                                });
                                if (!res.ok) { const d = await res.json(); setNotifySnack(`Error: ${d.message}`); return; }
                                setNotifySnack(`✓ Adjustment deleted. FSE & TL notified.`);
                                setDeletingAdjKey(null); setDeleteAdjReason('');
                                // Remove from local empData
                                setEditPtsEmp(prev => ({
                                  ...prev,
                                  empData: {
                                    ...prev.empData,
                                    adjustmentHistory: prev.empData.adjustmentHistory.filter(x => x._id?.toString() !== hid)
                                  }
                                }));
                              } catch (err) { setNotifySnack(`Error: ${err.message}`); }
                            }}>
                            Confirm Delete
                          </Button>
                          <Button size="small" onClick={() => { setDeletingAdjKey(null); setDeleteAdjReason(''); }} sx={{ fontSize: 11 }}>
                            Cancel
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#e6f4ea', borderRadius: 2 }}>
            <Typography variant="body2" fontWeight={700} sx={{ color: BRAND.primary }}>
              Final Total:{' '}
              {Math.round(editPtsAutoTotal * 10) / 10} (auto)
              {editPtsSlabBonus > 0 && <> + <span style={{ color: '#2e7d32' }}>{Math.round(editPtsSlabBonus * 10) / 10} (slab bonus)</span></>}
              {(parseFloat(editPtsValue) || 0) !== 0 && <> + ({parseFloat(editPtsValue) >= 0 ? '+' : ''}{parseFloat(editPtsValue) || 0}) (manual)</>}
              {' '}= {Math.round((editPtsVerifiedTotal + (parseFloat(editPtsValue) || 0)) * 10) / 10} pts
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setEditPtsOpen(false); setProductSlabs({}); setEditPtsEmp(null); setEditPtsValue(''); setEditPtsReason(''); }} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleSavePoints} disabled={editPtsSaving}
            sx={{ bgcolor: BRAND.primary, fontWeight: 700 }}>
            {editPtsSaving ? 'Saving…' : 'Save Points'}
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* Points Activity Section */}
      {mainTab === 'activity' && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND.primary, mb: 2 }}>
            Points Activity History
          </Typography>
          
          {activityLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress sx={{ color: BRAND.primary }} />
            </Box>
          ) : pointsActivity.length === 0 ? (
            <Card sx={{ textAlign: 'center', py: 6, border: `1.5px dashed ${BRAND.primaryLight}` }}>
              <Typography color="text.secondary">No points activity yet.</Typography>
            </Card>
          ) : (
            <TableContainer component={Card} sx={{ border: `1.5px solid ${BRAND.primaryLight}` }}>
              <Table>
                <TableHead sx={{ bgcolor: BRAND.primaryLight }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>FSE Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Slab Details</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pointsActivity.map((activity, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>
                        {new Date(activity.createdAt).toLocaleDateString('en-IN', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {activity.employeeName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <ProductChip product={activity.product} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: BRAND.primary, fontWeight: 600 }}>
                          {activity.slabDetails.forms} × {activity.slabDetails.multiplier} = {activity.slabDetails.points} pts
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {activity.reason || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={activity.actionType} 
                          size="small"
                          sx={{ 
                            bgcolor: activity.actionType === 'added' ? '#e6f4ea' : activity.actionType === 'modified' ? '#fff8e1' : '#fdecea',
                            color: activity.actionType === 'added' ? '#2e7d32' : activity.actionType === 'modified' ? '#f57f17' : '#c62828',
                            fontWeight: 700,
                            textTransform: 'capitalize'
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      <Snackbar open={!!notifySnack} autoHideDuration={4000} onClose={() => setNotifySnack('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notifySnack.startsWith('✓') ? 'success' : 'error'} variant="filled"
          onClose={() => setNotifySnack('')}>
          {notifySnack}
        </Alert>
      </Snackbar>

      {/* Meeting Scheduler Dialog */}
      <MeetingScheduler 
        open={meetingOpen} 
        onClose={() => setMeetingOpen(false)}
        employees={employees}
        tls={tls}
      />
    </Box>
  );
}
