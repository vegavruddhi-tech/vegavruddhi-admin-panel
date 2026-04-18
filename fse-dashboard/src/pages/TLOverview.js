import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
                </TableRow>
              </TableHead>
              <TableBody>
                {fseForms.map(f => {
                  const vs = verifyMap?.[getKey(f)]?.status || 'Not Found';
                  const vColor = vs === 'Fully Verified' ? '#2e7d32' : vs === 'Partially Done' ? '#f57f17' : '#888';
                  const vBg    = vs === 'Fully Verified' ? '#e6f4ea' : vs === 'Partially Done' ? '#fff8e1' : '#f5f5f5';
                  const vLabel = vs === 'Fully Verified' ? '✔ Fully Verified' : vs === 'Partially Done' ? '◑ Partially Done' : vs === 'Not Verified' ? '✗ Not Verified' : '– Not Found';
                  return (
                    <TableRow key={f._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell><Typography variant="body2" fontWeight={600}>{f.customerName}</Typography></TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{f.customerNumber}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{f.location}</Typography></TableCell>
                      <TableCell>
                        <Box component="span" sx={{ px: 1, py: 0.3, borderRadius: 10, fontSize: 11, fontWeight: 700, bgcolor: vBg, color: vColor }}>{vLabel}</Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{f.tideProduct || f.brand || f.formFillingFor || '–'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Typography>
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

function TLCard({ tlData, search, verifyMap }) {
  const [expanded, setExpanded] = useState(false);
  const { tl, fses, forms } = tlData;
  const tlName = tl.name || tl.email;

  const filteredFSEs = useMemo(() => {
    if (!search) return fses;
    const q = search.toLowerCase();
    return fses.filter(f =>
      (f.newJoinerName || '').toLowerCase().includes(q) ||
      (f.location || '').toLowerCase().includes(q)
    );
  }, [fses, search]);

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
          <Chip label={`${fses.length} FSEs`} size="small"
            sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 700, fontSize: 11 }} />
          <Chip label={`${forms.length} forms`} size="small"
            sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700, fontSize: 11 }} />
          {expanded ? <ExpandLessIcon sx={{ color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ px: 2.5, pb: 2 }}>
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

export default function TLOverview() {
  const [data,      setData]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [search,    setSearch]    = useState('');
  const [drillOpen, setDrillOpen] = useState(null);
  const [verifyKpiOpen, setVerifyKpiOpen] = useState(null);
  const [globalVerifyMap, setGlobalVerifyMap] = useState({});
  const [productDrillOpen, setProductDrillOpen] = useState(null); // { status, product }
  const [tlDrillOpen, setTlDrillOpen] = useState(null); // { status, product, tlName, tlData }
  const [dateFilter, setDateFilter] = useState('all');
  const [fromDate,   setFromDate]   = useState('');
  const [toDate,     setToDate]     = useState('');

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
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.primary }}>TL Overview</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            All Team Leaders with their FSEs and merchant submissions
          </Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}
          sx={{ borderColor: BRAND.primary, color: BRAND.primary, fontWeight: 700 }}>
          Refresh
        </Button>
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

      {/* Search */}
      <Autocomplete
        size="small" options={tlOptions} value={search || null} freeSolo
        onInputChange={(_, v) => setSearch(v || '')}
        renderInput={(params) => (
          <TextField {...params} placeholder="Search by TL name or location…"
            slotProps={{ input: { ...params.InputProps, startAdornment: <><SearchIcon sx={{ color: 'text.secondary', mr: 0.5 }} />{params.InputProps.startAdornment}</> } }} />
        )}
        sx={{ mb: 3 }} />

      {error && <Alert severity="error" sx={{ mb: 3 }} action={<Button size="small" onClick={load}>Retry</Button>}>{error}</Alert>}

      {loading ? (
        <Box>
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
          <TLCard key={tlData.tl._id || i} tlData={tlData} search={search} verifyMap={globalVerifyMap} />
        ))
      )}

      {/* Drill-down Modal */}
      {drillOpen && (
        <Dialog open onClose={() => setDrillOpen(null)} maxWidth="lg" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" component="span" fontWeight={800} sx={{ color: drillOpen.color }}>{drillOpen.title}</Typography>
              <Typography variant="body2" color="text.secondary">{drillOpen.rows.length} records</Typography>
            </Box>
            <IconButton onClick={() => setDrillOpen(null)} size="small"><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: drillOpen.color, color: '#fff', width: 40 }}>#</TableCell>
                    {drillOpen.cols.map(c => <TableCell key={c} sx={{ fontWeight: 700, bgcolor: drillOpen.color, color: '#fff' }}>{c}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drillOpen.rows.map((row, i) => {
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
            <Button onClick={() => setDrillOpen(null)} variant="contained" sx={{ bgcolor: drillOpen.color, fontWeight: 700 }}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
