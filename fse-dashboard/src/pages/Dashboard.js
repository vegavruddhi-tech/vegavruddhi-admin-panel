import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, useTheme, Card, CardContent, Button, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
  Autocomplete, Skeleton
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { BRAND } from "../theme";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, ComposedChart, Line, Cell
} from "recharts";

const COLORS = ["#7c3aed","#10b981","#3b82f6","#f59e0b","#14b8a6","#ec4899","#0ea5e9","#ef4444"];

function OnboardVerifySection({ filteredForms, onboardVerifyMap, onboardVerifying, verifyDrillStatus, setVerifyDrillStatus, employees }) {
  const [drillModal, setDrillModal] = useState(null); // { product, status, color, bg, rows, total, matched }

  const onboardForms = filteredForms.filter(f => f.status === 'Ready for Onboarding');
  const getKey = (f) => {
    const p = (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim();
    return p ? `${f.customerNumber}__${p}` : f.customerNumber;
  };

  const fullyVerified = onboardForms.filter(f => onboardVerifyMap[getKey(f)]?.status === 'Fully Verified').length;
  const partiallyDone = onboardForms.filter(f => onboardVerifyMap[getKey(f)]?.status === 'Partially Done').length;
  const notFound      = onboardForms.filter(f => !onboardVerifyMap[getKey(f)] || onboardVerifyMap[getKey(f)]?.status === 'Not Found').length;

  const statusColor = { 'Fully Verified': '#2e7d32', 'Partially Done': '#f57f17', 'Not Found': '#757575' };
  const statusBg    = { 'Fully Verified': '#e6f4ea', 'Partially Done': '#fff8e1', 'Not Found': '#f5f5f5' };

  const buildBreakdown = (status) => {
    const productMap = {};
    onboardForms.forEach(f => {
      const rawProduct = f.formFillingFor || f.tideProduct || f.brand || '–';
      const product    = rawProduct.toLowerCase() === 'msme' ? 'Tide MSME' : rawProduct;
      const s          = onboardVerifyMap[getKey(f)]?.status || 'Not Found';
      if (!productMap[product]) productMap[product] = { matched: 0, total: 0 };
      productMap[product].total++;
      if (s === status) productMap[product].matched++;
    });
    return Object.entries(productMap).filter(([, v]) => v.matched > 0).sort((a, b) => b[1].matched - a[1].matched);
  };

  const buildProductRows = (status, product) => {
    return onboardForms
      .filter(f => {
        const rawProduct = f.formFillingFor || f.tideProduct || f.brand || '–';
        const normalized = rawProduct.toLowerCase() === 'msme' ? 'Tide MSME' : rawProduct;
        const s = onboardVerifyMap[getKey(f)]?.status || 'Not Found';
        return normalized === product && s === status;
      })
      .map(f => {
        const emp = (employees || []).find(e => e.newJoinerName === f.employeeName);
        return {
          customerName:  f.customerName   || '–',
          customerPhone: f.customerNumber || '–',
          fse:           f.employeeName   || '–',
          tl:            emp?.reportingManager || '–',
          fseEmail:      emp?.email || emp?.newJoinerEmailId || '–',
          date:          new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        };
      })
      .sort((a, b) => a.fse.localeCompare(b.fse));
  };

  const statusIcon = { 'Fully Verified': '✓', 'Partially Done': '◑', 'Not Found': '–' };

  return (
    <Box sx={{ mb: 3 }}>
      {/* 3 verification KPI cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: verifyDrillStatus ? 1 : 3 }}>
        {onboardVerifying ? (
          <Card sx={{ gridColumn: '1 / -1', borderRadius: 3, bgcolor: '#f9f9f9', border: '1.5px solid #e0e0e0' }}>
            <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Loading verification data…</Typography>
            </CardContent>
          </Card>
        ) : [
          { label: '✓ Fully Verified', value: fullyVerified, color: '#2e7d32', bg: '#e6f4ea', status: 'Fully Verified' },
          { label: '◑ Partially Done', value: partiallyDone, color: '#f57f17', bg: '#fff8e1', status: 'Partially Done' },
          { label: '– Not Found',      value: notFound,      color: '#757575', bg: '#f5f5f5', status: 'Not Found'      },
        ].map(k => (
          <Card key={k.label}
            onClick={() => setVerifyDrillStatus(verifyDrillStatus === k.status ? null : k.status)}
            sx={{ borderRadius: 3, bgcolor: k.bg, border: `1.5px solid ${k.color}30`, cursor: 'pointer',
              outline: verifyDrillStatus === k.status ? `2px solid ${k.color}` : 'none',
              transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 16px ${k.color}30` } }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" fontWeight={700} sx={{ color: k.color }}>{k.label}</Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: k.color }}>{k.value}</Typography>
              <Typography variant="caption" color="text.secondary">of {onboardForms.length} onboarding forms</Typography>
              <Typography variant="caption" sx={{ display: 'block', color: k.color, opacity: 0.7 }}>
                {verifyDrillStatus === k.status ? '▲ hide breakdown' : '▼ product breakdown'}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Inline product breakdown — click a product card to open the table modal */}
      {verifyDrillStatus && (() => {
        const color     = statusColor[verifyDrillStatus];
        const bg        = statusBg[verifyDrillStatus];
        const breakdown = buildBreakdown(verifyDrillStatus);
        return (
          <Box sx={{ mb: 3, p: 2, borderRadius: 3, bgcolor: bg, border: `1.5px solid ${color}30` }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ color }}>
                {statusIcon[verifyDrillStatus]} {verifyDrillStatus} — Product Breakdown
              </Typography>
              <Button size="small" onClick={() => setVerifyDrillStatus(null)}
                sx={{ color, fontWeight: 700, minWidth: 0 }}>✕ Close</Button>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 1.5 }}>
              {breakdown.map(([product, v]) => (
                <Card key={product}
                  onClick={() => setDrillModal({
                    product, status: verifyDrillStatus, color, bg,
                    rows: buildProductRows(verifyDrillStatus, product),
                    total: v.total, matched: v.matched
                  })}
                  sx={{
                    borderRadius: 2, border: `1px solid ${color}30`, cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 16px ${color}30`, borderColor: color }
                  }}>
                  <CardContent sx={{ py: 1, px: 1.5 }}>
                    <Typography variant="caption" fontWeight={700} sx={{ color, display: 'block' }}>{product}</Typography>
                    <Typography variant="h6" fontWeight={800} sx={{ color }}>{v.matched}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      of {v.total} · {Math.round((v.matched / v.total) * 100)}%
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color, opacity: 0.6, fontSize: 10 }}>
                      click to see records ↗
                    </Typography>
                  </CardContent>
                </Card>
              ))}
              {breakdown.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ gridColumn: '1/-1', py: 1 }}>
                  No products found for this status.
                </Typography>
              )}
            </Box>
          </Box>
        );
      })()}

      {/* Product-level drill-down modal */}
      {drillModal && (
        <Dialog open={!!drillModal} onClose={() => setDrillModal(null)} maxWidth="lg" fullWidth
          PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
          <Box sx={{ background: `linear-gradient(135deg, ${drillModal.color}dd, ${drillModal.color}88)`, px: 3, py: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, letterSpacing: 1.5 }}>
                  {drillModal.status} · PRODUCT DRILL-DOWN
                </Typography>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mt: 0.3 }}>
                  {drillModal.product}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                    <strong>{drillModal.matched}</strong> {drillModal.status.toLowerCase()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                    of {drillModal.total} total · {Math.round((drillModal.matched / drillModal.total) * 100)}% rate
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={() => setDrillModal(null)}
                sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <DialogContent sx={{ p: 0 }}>
            {drillModal.rows.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="body1" color="text.secondary">No records found.</Typography>
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: 480 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {['#', 'Customer Name', 'Phone', 'FSE', 'TL', 'FSE Email', 'Date'].map(h => (
                        <TableCell key={h} sx={{
                          fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8,
                          bgcolor: drillModal.bg, color: drillModal.color,
                          borderBottom: `2px solid ${drillModal.color}40`, whiteSpace: 'nowrap'
                        }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {drillModal.rows.map((row, i) => (
                      <TableRow key={i} hover sx={{ '&:nth-of-type(even)': { bgcolor: `${drillModal.color}06` } }}>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600, fontSize: 11 }}>{i + 1}</TableCell>
                        <TableCell><Typography variant="body2" fontWeight={700}>{row.customerName}</Typography></TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{row.customerPhone}</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={600}>{row.fse}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">{row.tl}</Typography></TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{row.fseEmail}</Typography></TableCell>
                        <TableCell><Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{row.date}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
              {drillModal.rows.length} record{drillModal.rows.length !== 1 ? 's' : ''} for {drillModal.product}
            </Typography>
            <Button onClick={() => setDrillModal(null)} variant="contained"
              sx={{ bgcolor: drillModal.color, fontWeight: 700, borderRadius: 2, '&:hover': { opacity: 0.9 } }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

function Dashboard() {
  const [forms,        setForms]        = useState([]);
  const [employees,    setEmployees]    = useState([]);
  const [tls,          setTls]          = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [dateFilter,   setDateFilter]   = useState('all');
  const [fromDate,     setFromDate]     = useState('');
  const [toDate,       setToDate]       = useState('');
  const [filterTL,     setFilterTL]     = useState('');
  const [filterFSE,    setFilterFSE]    = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth,  setFilterMonth]  = useState('');
  const [showOnboardVerify,  setShowOnboardVerify]  = useState(false);
  const [onboardVerifying,   setOnboardVerifying]   = useState(false);
  const [onboardVerifyMap,   setOnboardVerifyMap]   = useState({});
  const [globalVerifyMap,    setGlobalVerifyMap]    = useState({});
  const [chartMetric,        setChartMetric]        = useState('forms');
  const [verifyDrillStatus,  setVerifyDrillStatus]  = useState(null);
  const [kpiDrillOpen,       setKpiDrillOpen]       = useState(null); // 'totalForms'|'totalEmployees'|'activeEmployees'|'totalTLs'
  const [chartDrill,         setChartDrill]         = useState(null); // { type, key, title, rows }

  const muiTheme = useTheme();
  const chartTheme = useMemo(() => {
    const isDark = muiTheme.palette.mode === "dark";
    return {
      tooltipBg: isDark ? "#1e2d3d" : "#ffffff",
      text: muiTheme.palette.text.primary,
    };
  }, [muiTheme.palette]);

const EMP_API = process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api';

const loadData = async () => {
  try {
    const res = await fetch(`${EMP_API}/forms/admin/overview`);
    const data = res.ok ? await res.json() : { filteredForms: [], employees: [], tls: [] };
    setForms(data.forms || []);
    setEmployees(data.employees || []);
    setTls(data.tls || []);
  } catch (err) {
    console.error('Overview load error:', err);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 1200000);
    return () => clearInterval(iv);
  }, []);
  const filteredForms = useMemo(() => {
  const now        = new Date();
  const today      = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart  = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return forms.filter(f => {
    const d = new Date(f.createdAt);
    if (dateFilter === 'today'  && d < today)      return false;
    if (dateFilter === 'week'   && d < weekStart)  return false;
    if (dateFilter === 'month'  && d < monthStart) return false;
    if (dateFilter === 'custom') {
      if (fromDate && d < new Date(fromDate))              return false;
      if (toDate   && d > new Date(toDate + 'T23:59:59')) return false;
    }
    if (filterMonth) {
      const m = new Date(f.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' });
      if (m !== filterMonth) return false;
    }
    if (filterTL) {
      const emp = employees.find(e => e.newJoinerName === f.employeeName);
      if (!emp || (emp.reportingManager || '').toLowerCase().trim() !== filterTL.toLowerCase().trim()) return false;
    }
    if (filterFSE    && f.employeeName !== filterFSE)    return false;
    if (filterStatus && f.status       !== filterStatus) return false;
    return true;
  });
}, [forms, dateFilter, fromDate, toDate, filterMonth, filterTL, filterFSE, filterStatus, employees]);

// Fetch global verification for all filtered forms (batched to avoid URL length limit)
useEffect(() => {
  if (!filteredForms.length) { setGlobalVerifyMap({}); return; }
  const getP = (f) => (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim();
  const BATCH = 50;
  const batches = [];
  for (let i = 0; i < filteredForms.length; i += BATCH) batches.push(filteredForms.slice(i, i + BATCH));
  Promise.all(batches.map(batch => {
    const phones   = batch.map(f => f.customerNumber).join(',');
    const names    = batch.map(f => encodeURIComponent(f.customerName || '')).join(',');
    const products = batch.map(f => encodeURIComponent(getP(f))).join(',');
    const months   = batch.map(f => encodeURIComponent(new Date(f.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' }))).join(',');
    return fetch(`${EMP_API}/verify/bulk-admin?phones=${encodeURIComponent(phones)}&names=${names}&products=${products}&months=${months}`)
      .then(r => r.ok ? r.json() : {}).catch(() => ({}));
  })).then(results => setGlobalVerifyMap(Object.assign({}, ...results)));
}, [filteredForms]); // eslint-disable-line
const monthOptions = useMemo(() => {
  const seen = new Set();
  forms.forEach(f => {
    if (f.createdAt) {
      const m = new Date(f.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' });
      seen.add(m);
    }
  });
  return [...seen].sort();
}, [forms]);

const tlOptions   = useMemo(() => [...new Set(tls.map(t => t.name).filter(Boolean))].sort(), [tls]);
const fseOptions  = useMemo(() => {
  if (filterTL) {
    return [...new Set(
      employees
        .filter(e => (e.reportingManager || '').toLowerCase().trim() === filterTL.toLowerCase().trim())
        .map(e => e.newJoinerName)
        .filter(Boolean)
    )].sort();
  }
  return [...new Set(employees.map(e => e.newJoinerName).filter(Boolean))].sort();
}, [employees, filterTL]);
const statusOptions = ['Ready for Onboarding', 'Not Interested', 'Try but not done due to error', 'Need to visit again'];

  // ── KPIs from MongoDB ─────────────────────────────────────────
const kpiData = useMemo(() => {
  const totalForms      = filteredForms.length;

  // Employee/TL counts scoped to current filter
  const filteredEmployees = filterTL
    ? employees.filter(e => (e.reportingManager || '').toLowerCase().trim() === filterTL.toLowerCase().trim())
    : filterFSE
    ? employees.filter(e => e.newJoinerName === filterFSE)
    : employees;

  const totalEmployees  = filteredEmployees.length;
  const totalTLs        = filterTL ? 1 : tls.length;
  const activeEmployees = new Set(filteredForms.map(f => f.employeeName).filter(Boolean)).size;

  const productMap = {};
  filteredForms.forEach(f => {
    const product = f.formFillingFor || f.tideProduct || f.brand || 'Other';
    const normalized = product.toLowerCase() === 'msme' ? 'Tide MSME' : product;
    if (!productMap[normalized]) productMap[normalized] = 0;
    productMap[normalized]++;
  });

  const onboarding = filteredForms.filter(f => f.status === 'Ready for Onboarding').length;
  const notInt     = filteredForms.filter(f => f.status === 'Not Interested').length;
  const tryErr     = filteredForms.filter(f => f.status === 'Try but not done due to error').length;
  const revisit    = filteredForms.filter(f => f.status === 'Need to visit again').length;

  const dateMap = {};
  filteredForms.forEach(f => {
    const d = new Date(f.createdAt).toISOString().slice(0, 10);
    if (!dateMap[d]) dateMap[d] = 0;
    dateMap[d]++;
  });
  const dailyTrend = Object.entries(dateMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  const fseMap = {};
  filteredForms.forEach(f => {
    const name = f.employeeName || 'Unknown';
    if (!fseMap[name]) fseMap[name] = 0;
    fseMap[name]++;
  });
  const topFSEs = Object.entries(fseMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return {
    totalForms, totalEmployees, totalTLs, activeEmployees,
    productMap, onboarding, notInt, tryErr, revisit,
    dailyTrend, topFSEs
  };
}, [filteredForms, employees, tls, filterTL, filterFSE]);


  const tooltipStyle = { backgroundColor: chartTheme.tooltipBg, color: chartTheme.text, border: "none" };

  return (
    <>
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 800, color: BRAND.primary }}>FSE Overview</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
    {['all', 'today', 'week', 'month'].map(f => (
      <Button key={f} size="small"
        variant={dateFilter === f ? 'contained' : 'outlined'}
        onClick={() => { setDateFilter(f); setFromDate(''); setToDate(''); }}
        sx={{ fontWeight: 700, textTransform: 'capitalize',
          bgcolor: dateFilter === f ? BRAND.primary : 'transparent',
          borderColor: BRAND.primary, color: dateFilter === f ? '#fff' : BRAND.primary }}>
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
      <Button size="small" variant="outlined" color="error" fontWeight={700}
        onClick={() => { setDateFilter('all'); setFromDate(''); setToDate(''); }}>
        Reset
      </Button>
    )}
  </Box>
<Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
  <Autocomplete
    size="small" options={monthOptions} value={filterMonth || null}
    onChange={(_, v) => setFilterMonth(v || '')}
    renderInput={(params) => <TextField {...params} label="Month" />}
    sx={{ minWidth: 150 }} freeSolo={false} />

  <Autocomplete
    size="small" options={tlOptions} value={filterTL || null}
    onChange={(_, v) => { setFilterTL(v || ''); setFilterFSE(''); }}
    renderInput={(params) => <TextField {...params} label="Team Leader" />}
    sx={{ minWidth: 180 }} freeSolo={false} />

  <Autocomplete
    size="small" options={fseOptions} value={filterFSE || null}
    onChange={(_, v) => {
      setFilterFSE(v || '');
      // Auto-detect TL when FSE is selected
      if (v) {
        const emp = employees.find(e => e.newJoinerName === v);
        if (emp?.reportingManager) setFilterTL(emp.reportingManager);
      }
    }}
    renderInput={(params) => <TextField {...params} label="Employee" />}
    sx={{ minWidth: 180 }} freeSolo={false} />

  <Autocomplete
    size="small" options={statusOptions} value={filterStatus || null}
    onChange={(_, v) => setFilterStatus(v || '')}
    renderInput={(params) => <TextField {...params} label="Status" />}
    sx={{ minWidth: 220 }} freeSolo={false} />

  <Button variant="outlined" size="small" onClick={() => {
    setFilterTL(''); setFilterFSE(''); setFilterStatus(''); setFilterMonth('');
    setDateFilter('all'); setFromDate(''); setToDate('');
  }} sx={{ fontWeight: 700 }}>Reset</Button>
</Box>

    {/* KPI Cards */}
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, mb: 3 }}>
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} variant="outlined" sx={{ borderRadius: 3 }}>
            <Box sx={{ height: 5, borderRadius: '3px 3px 0 0' }}>
              <Skeleton variant="rectangular" height={5} />
            </Box>
            <CardContent>
              <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="40%" height={40} />
              <Skeleton variant="text" width="50%" height={16} />
            </CardContent>
          </Card>
        ))
      ) : (
        [
          { label: 'Total Forms',       value: kpiData.totalForms,      color: '#7c3aed', key: 'totalForms' },
          { label: 'Total Employees',   value: kpiData.totalEmployees,  color: '#3b82f6', key: 'totalEmployees' },
          { label: 'Active Employees',  value: kpiData.activeEmployees, color: '#10b981', key: 'activeEmployees' },
          { label: 'Total TLs',         value: kpiData.totalTLs,        color: '#f59e0b', key: 'totalTLs' },
          { label: 'Ready to Onboard',  value: kpiData.onboarding,      color: '#14b8a6', key: 'onboarding' },
        ].map(k => (
          <Card key={k.label} variant="outlined" sx={{ borderRadius: 3, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 16px ${k.color}30` } }}
            onClick={() => setKpiDrillOpen(k.key)}>
            <Box sx={{ height: 5, bgcolor: k.color, borderRadius: '3px 3px 0 0' }} />
            <CardContent>
              <Typography variant="body2" color="text.secondary">{k.label}</Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: k.color }}>{k.value}</Typography>
              <Typography variant="caption" sx={{ color: k.color, opacity: 0.7 }}>click to explore ↗</Typography>
            </CardContent>
          </Card>
        ))
      )}
    </Box>

    {/* Visit Status KPIs */}
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: showOnboardVerify ? 1 : 3 }}>
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ py: 1.5 }}>
              <Skeleton variant="text" width="70%" height={18} sx={{ mb: 0.5 }} />
              <Skeleton variant="text" width="35%" height={44} />
            </CardContent>
          </Card>
        ))
      ) : (
        [
          { label: 'Ready for Onboarding',          value: kpiData.onboarding, color: '#2e7d32', bg: '#e6f4ea', clickable: true },
          { label: 'Not Interested',                value: kpiData.notInt,     color: '#c62828', bg: '#fdecea' },
          { label: 'Try but not done due to error', value: kpiData.tryErr,     color: '#e65100', bg: '#fff3e0' },
          { label: 'Need to visit again',           value: kpiData.revisit,    color: '#1565c0', bg: '#e3f2fd' },
        ].map(k => (
        <Card key={k.label} sx={{
          borderRadius: 3, bgcolor: k.bg, border: `1.5px solid ${k.color}30`,
          cursor: k.clickable ? 'pointer' : 'default',
          outline: k.clickable && showOnboardVerify ? `2px solid ${k.color}` : 'none',
          transition: 'all 0.2s',
          '&:hover': k.clickable ? { transform: 'translateY(-2px)', boxShadow: `0 4px 16px ${k.color}30` } : {}
        }}
          onClick={k.clickable ? async () => {
            if (showOnboardVerify) { setShowOnboardVerify(false); return; }
            setShowOnboardVerify(true);
            setOnboardVerifying(true);
            const onboardForms = filteredForms.filter(f => f.status === 'Ready for Onboarding');
            if (!onboardForms.length) { setOnboardVerifying(false); return; }
            const BATCH = 50;
            const batches = [];
            for (let i = 0; i < onboardForms.length; i += BATCH) batches.push(onboardForms.slice(i, i + BATCH));
            try {
              const results = await Promise.all(batches.map(batch => {
                const phones   = batch.map(f => f.customerNumber).join(',');
                const names    = batch.map(f => encodeURIComponent(f.customerName || '')).join(',');
                const products = batch.map(f => encodeURIComponent((f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim())).join(',');
                const months   = batch.map(f => encodeURIComponent(new Date(f.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' }))).join(',');
                return fetch(`${EMP_API}/verify/bulk-admin?phones=${encodeURIComponent(phones)}&names=${names}&products=${products}&months=${months}`)
                  .then(r => r.ok ? r.json() : {}).catch(() => ({}));
              }));
              setOnboardVerifyMap(Object.assign({}, ...results));
            } catch { /* ignore */ }
            setOnboardVerifying(false);
          } : undefined}>
          <CardContent sx={{ py: 1.5 }}>
            <Typography variant="caption" fontWeight={700} sx={{ color: k.color }}>{k.label}</Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: k.color }}>{k.value}</Typography>
            {k.clickable && (
              <Typography variant="caption" sx={{ color: k.color, opacity: 0.7 }}>
                {showOnboardVerify ? '▲ hide verification' : '▼ show verification'}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))
      )}
    </Box>

    {/* Onboarding Verification Sub-KPIs — shown only when Ready for Onboarding is clicked */}
    {showOnboardVerify && <OnboardVerifySection
      filteredForms={filteredForms}
      onboardVerifyMap={onboardVerifyMap}
      onboardVerifying={onboardVerifying}
      verifyDrillStatus={verifyDrillStatus}
      setVerifyDrillStatus={setVerifyDrillStatus}
      employees={employees}
    />}

    {/* Product Breakdown + Daily Trend */}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>

      {/* Product Breakdown */}
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Forms by Product</Typography>
          {loading ? <Skeleton variant="rounded" height={280} /> : (
            <Box>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={Object.entries(kpiData.productMap).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))}
                  margin={{ top: 8, right: 16, bottom: 60, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" tick={{ fontSize: 10 }} height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(124,58,237,0.08)' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} style={{ cursor: 'pointer' }}
                    onClick={(data) => {
                      if (!data?.name) return;
                      const product = data.name;
                      const rows = filteredForms
                        .filter(f => {
                          const p = f.formFillingFor || f.tideProduct || f.brand || 'Other';
                          const normalized = p.toLowerCase() === 'msme' ? 'Tide MSME' : p;
                          return normalized === product;
                        })
                        .map(f => {
                          const emp = employees.find(e => e.newJoinerName === f.employeeName);
                          return {
                            merchant: f.customerName || '–',
                            phone: f.customerNumber || '–',
                            fse: f.employeeName || '–',
                            fseEmail: emp?.email || emp?.newJoinerEmailId || '–',
                            tl: emp?.reportingManager || '–',
                            status: f.status || '–',
                            date: new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                          };
                        });
                      setChartDrill({ title: `📦 ${product}`, subtitle: `${rows.length} forms`, color: '#7c3aed', cols: ['Merchant', 'Phone', 'FSE', 'FSE Email', 'TL', 'Status', 'Date'], rows });
                    }}>
                    {Object.keys(kpiData.productMap).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>Click any bar to explore</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Daily Trend */}
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Daily Form Submissions</Typography>
          {loading ? <Skeleton variant="rounded" height={280} /> : (
            <Box>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={kpiData.dailyTrend} margin={{ top: 8, right: 16, bottom: 40, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" angle={-30} textAnchor="end" tick={{ fontSize: 9 }} height={60} />
                  <YAxis allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(26,71,49,0.08)' }} />
                  <Bar dataKey="count" name="Forms" fill={BRAND.primary} radius={[4, 4, 0, 0]} style={{ cursor: 'pointer' }}
                    onClick={(data) => {
                      if (!data?.date) return;
                      const date = data.date;
                      const rows = filteredForms
                        .filter(f => new Date(f.createdAt).toISOString().slice(0, 10) === date)
                        .map(f => {
                          const emp = employees.find(e => e.newJoinerName === f.employeeName);
                          return {
                            merchant: f.customerName || '–',
                            phone: f.customerNumber || '–',
                            fse: f.employeeName || '–',
                            fseEmail: emp?.email || emp?.newJoinerEmailId || '–',
                            tl: emp?.reportingManager || '–',
                            product: f.formFillingFor || f.brand || '–',
                            status: f.status || '–',
                          };
                        });
                      setChartDrill({ title: `📅 ${date}`, subtitle: `${rows.length} submissions`, color: BRAND.primary, cols: ['Merchant', 'Phone', 'FSE', 'FSE Email', 'TL', 'Product', 'Status'], rows });
                    }} />
                  <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>Click any bar to explore</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

    </Box>

    {/* Top FSEs */}
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" fontWeight={700}>Top 10 FSEs</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {[
              { key: 'forms',      label: 'Form Count',         color: BRAND.primary },
              { key: 'onboarding', label: 'Ready to Onboard',   color: '#2e7d32' },
              { key: 'verified',   label: 'Fully Verified',     color: '#10b981' },
              { key: 'points',     label: 'Points',             color: '#f59e0b' },
            ].map(m => (
              <Button key={m.key} size="small"
                variant={chartMetric === m.key ? 'contained' : 'outlined'}
                onClick={() => setChartMetric(m.key)}
                sx={{ fontWeight: 700, fontSize: 11,
                  bgcolor: chartMetric === m.key ? m.color : 'transparent',
                  borderColor: m.color, color: chartMetric === m.key ? '#fff' : m.color,
                  '&:hover': { bgcolor: m.color, color: '#fff' } }}>
                {m.label}
              </Button>
            ))}
          </Box>
        </Box>
        {loading ? (
          <Skeleton variant="rounded" height={280} />
        ) : (
          <Box>
          <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={(() => {
              const POINTS_MAP = { 'tide': 2, 'tide msme': 0.3, 'tide insurance': 1, 'tide credit card': 1, 'tide bt': 1 };
              const getKey = (f) => { const p = (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim(); return p ? `${f.customerNumber}__${p}` : f.customerNumber; };
              const fseMap = {};
              filteredForms.forEach(f => {
                const name = f.employeeName || 'Unknown';
                if (!fseMap[name]) fseMap[name] = { name, forms: 0, onboarding: 0, verified: 0, points: 0 };
                fseMap[name].forms++;
                if (f.status === 'Ready for Onboarding') fseMap[name].onboarding++;
                if (globalVerifyMap[getKey(f)]?.status === 'Fully Verified') {
                  fseMap[name].verified++;
                  const p = (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim();
                  fseMap[name].points += POINTS_MAP[p] || 0;
                }
              });
              return Object.values(fseMap)
                .sort((a, b) => b[chartMetric] - a[chartMetric])
                .slice(0, 10)
                .map(d => ({ name: d.name, count: Math.round(d[chartMetric] * 10) / 10 }));
            })()}
            layout="vertical"
            margin={{ top: 8, right: 40, bottom: 8, left: 120 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
            <Tooltip formatter={(v) => [v, { forms: 'Forms', onboarding: 'Onboarding', verified: 'Verified', points: 'Points' }[chartMetric]]} cursor={{ fill: 'rgba(16,185,129,0.08)' }} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} style={{ cursor: 'pointer' }}
              fill={{ forms: BRAND.primary, onboarding: '#2e7d32', verified: '#10b981', points: '#f59e0b' }[chartMetric]}
              onClick={(data) => {
                if (!data?.name) return;
                const fseName = data.name;
                const emp = employees.find(e => e.newJoinerName === fseName);
                const fseForms = filteredForms.filter(f => f.employeeName === fseName);
                const getKey = (f) => { const p = (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim(); return p ? `${f.customerNumber}__${p}` : f.customerNumber; };
                const POINTS_MAP_LOCAL = { 'tide': 2, 'tide msme': 0.3, 'tide insurance': 1, 'tide credit card': 1, 'tide bt': 1 };

                let rows, cols, subtitle, metricLabel;

                if (chartMetric === 'forms') {
                  // All forms
                  metricLabel = 'All Forms';
                  cols = ['Merchant', 'Phone', 'Product', 'Status', 'Verification', 'Date'];
                  rows = fseForms.map(f => ({
                    merchant: f.customerName || '–', phone: f.customerNumber || '–',
                    product: f.formFillingFor || f.brand || '–', status: f.status || '–',
                    verification: globalVerifyMap[getKey(f)]?.status || 'Not Found',
                    date: new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                  }));

                } else if (chartMetric === 'onboarding') {
                  // Only Ready for Onboarding
                  metricLabel = 'Ready for Onboarding';
                  cols = ['Merchant', 'Phone', 'Product', 'Verification', 'Date'];
                  rows = fseForms
                    .filter(f => f.status === 'Ready for Onboarding')
                    .map(f => ({
                      merchant: f.customerName || '–', phone: f.customerNumber || '–',
                      product: f.formFillingFor || f.brand || '–',
                      verification: globalVerifyMap[getKey(f)]?.status || 'Not Found',
                      date: new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                    }));

                } else if (chartMetric === 'verified') {
                  // Only Fully Verified
                  metricLabel = 'Fully Verified';
                  cols = ['Merchant', 'Phone', 'Product', 'Status', 'Date'];
                  rows = fseForms
                    .filter(f => globalVerifyMap[getKey(f)]?.status === 'Fully Verified')
                    .map(f => ({
                      merchant: f.customerName || '–', phone: f.customerNumber || '–',
                      product: f.formFillingFor || f.brand || '–', status: f.status || '–',
                      date: new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                    }));

                } else if (chartMetric === 'points') {
                  // Only Fully Verified forms that earn points
                  metricLabel = 'Points';
                  cols = ['Merchant', 'Phone', 'Product', 'Points', 'Date'];
                  rows = fseForms
                    .filter(f => globalVerifyMap[getKey(f)]?.status === 'Fully Verified')
                    .map(f => {
                      const p = (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim();
                      const pts = POINTS_MAP_LOCAL[p] || 0;
                      return {
                        merchant: f.customerName || '–', phone: f.customerNumber || '–',
                        product: f.formFillingFor || f.brand || '–', points: pts,
                        date: new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                      };
                    })
                    .filter(r => r.points > 0);
                }

                subtitle = `${rows.length} ${metricLabel} · TL: ${emp?.reportingManager || '–'} · Email: ${emp?.email || emp?.newJoinerEmailId || '–'}`;
                setChartDrill({
                  title: `👤 ${fseName} — ${metricLabel}`,
                  subtitle,
                  color: { forms: BRAND.primary, onboarding: '#2e7d32', verified: '#10b981', points: '#f59e0b' }[chartMetric],
                  cols,
                  rows,
                  profile: { name: fseName, email: emp?.email || emp?.newJoinerEmailId || '–', phone: emp?.newJoinerPhone || '–', tl: emp?.reportingManager || '–', status: emp?.status || '–' }
                });
              }}>
              {kpiData.topFSEs.map((_, i) => (
                <Cell key={i} fill={{ forms: BRAND.primary, onboarding: '#2e7d32', verified: '#10b981', points: '#f59e0b' }[chartMetric]} />
              ))}
            </Bar>
          </BarChart>
          </ResponsiveContainer>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>Click any bar to explore FSE details</Typography>
          </Box>
        )}
      </CardContent>
    </Card>

  </Box>

  {/* Chart Drill-down Modal */}
  {chartDrill && (
    <Dialog open onClose={() => setChartDrill(null)} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ color: chartDrill.color }}>{chartDrill.title}</Typography>
            <Typography variant="body2" color="text.secondary">{chartDrill.subtitle}</Typography>
          </Box>
          <IconButton onClick={() => setChartDrill(null)} size="small"><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {/* FSE Profile Card (only for Top FSEs drill-down) */}
        {chartDrill.profile && (
          <Box sx={{ p: 2, bgcolor: `${chartDrill.color}10`, borderBottom: `1px solid ${chartDrill.color}20`, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {[
              { label: 'Name',   value: chartDrill.profile.name },
              { label: 'Email',  value: chartDrill.profile.email },
              { label: 'Phone',  value: chartDrill.profile.phone },
              { label: 'TL',     value: chartDrill.profile.tl },
              { label: 'Status', value: chartDrill.profile.status },
            ].map(item => (
              <Box key={item.label}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>{item.label}</Typography>
                <Typography variant="body2" fontWeight={600}>{item.value}</Typography>
              </Box>
            ))}
          </Box>
        )}
        <TableContainer sx={{ maxHeight: 500 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: chartDrill.color, color: '#fff', width: 40 }}>#</TableCell>
                {chartDrill.cols.map(c => (
                  <TableCell key={c} sx={{ fontWeight: 700, bgcolor: chartDrill.color, color: '#fff' }}>{c}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {chartDrill.rows.map((row, i) => {
                const colKeyMap = { 'Merchant': 'merchant', 'Phone': 'phone', 'FSE': 'fse', 'FSE Email': 'fseEmail', 'TL': 'tl', 'Product': 'product', 'Status': 'status', 'Date': 'date', 'Verification': 'verification', 'Points': 'points', 'Name': 'name', 'Email': 'email', 'Location': 'location', 'Forms': 'forms' };
                return (
                  <TableRow key={i} hover sx={{ '&:nth-of-type(even)': { bgcolor: `${chartDrill.color}05` } }}>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{i + 1}</TableCell>
                    {chartDrill.cols.map(c => {
                      const val = row[colKeyMap[c]] ?? '–';
                      // Color-code verification and status
                      if (c === 'Verification') {
                        const vColor = val === 'Fully Verified' ? '#2e7d32' : val === 'Partially Done' ? '#f57f17' : '#888';
                        const vBg = val === 'Fully Verified' ? '#e6f4ea' : val === 'Partially Done' ? '#fff8e1' : '#f5f5f5';
                        return <TableCell key={c}><Box component="span" sx={{ px: 1, py: 0.3, borderRadius: 10, fontSize: 11, fontWeight: 700, bgcolor: vBg, color: vColor }}>{val}</Box></TableCell>;
                      }
                      if (c === 'Status') {
                        const sColor = val === 'Ready for Onboarding' ? '#2e7d32' : val === 'Not Interested' ? '#c62828' : val === 'Try but not done due to error' ? '#e65100' : '#1565c0';
                        const sBg = val === 'Ready for Onboarding' ? '#e6f4ea' : val === 'Not Interested' ? '#fdecea' : val === 'Try but not done due to error' ? '#fff3e0' : '#e3f2fd';
                        const sShort = val === 'Ready for Onboarding' ? 'Onboarding' : val === 'Not Interested' ? 'Not Int.' : val === 'Try but not done due to error' ? 'Try/Err' : 'Revisit';
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
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>{chartDrill.rows.length} records</Typography>
        <Button onClick={() => setChartDrill(null)} variant="contained" sx={{ bgcolor: chartDrill.color, fontWeight: 700 }}>Close</Button>
      </DialogActions>
    </Dialog>
  )}

  {/* KPI Drill-down Modal */}
  {kpiDrillOpen && (() => {
    const configs = {
      totalForms:      { title: 'Total Forms',       color: '#7c3aed', rows: filteredForms.map(f => ({ name: f.customerName, phone: f.customerNumber, email: f.customerEmail || '–', employee: f.employeeName, status: f.status, date: new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) })), cols: ['Customer', 'Phone', 'Employee', 'Status', 'Date'] },
      totalEmployees:  { title: `Total Employees${filterTL ? ` — ${filterTL}` : ''}`, color: '#3b82f6', rows: (filterTL ? employees.filter(e => (e.reportingManager||'').toLowerCase().trim() === filterTL.toLowerCase().trim()) : filterFSE ? employees.filter(e => e.newJoinerName === filterFSE) : employees).map(e => ({ name: e.newJoinerName, email: e.email || e.newJoinerEmailId || '–', phone: e.newJoinerPhone, tl: e.reportingManager, status: e.status })), cols: ['Name', 'Email', 'Phone', 'TL', 'Status'] },
      activeEmployees: { title: 'Active Employees (submitted forms)', color: '#10b981', rows: [...new Set(filteredForms.map(f => f.employeeName).filter(Boolean))].map(name => { const emp = employees.find(e => e.newJoinerName === name); return { name, email: emp?.email || emp?.newJoinerEmailId || '–', phone: emp?.newJoinerPhone || '–', tl: emp?.reportingManager || '–', forms: filteredForms.filter(f => f.employeeName === name).length }; }), cols: ['Name', 'Email', 'Phone', 'TL', 'Forms'] },
      totalTLs:        { title: 'Total TLs',         color: '#f59e0b', rows: tls.map(t => ({ name: t.name, email: t.email, location: t.location, status: t.status })), cols: ['Name', 'Email', 'Location', 'Status'] },
      onboarding:      { title: 'Ready to Onboard',  color: '#14b8a6', rows: filteredForms.filter(f => f.status === 'Ready for Onboarding').map(f => ({ name: f.customerName, phone: f.customerNumber, employee: f.employeeName, product: f.formFillingFor || f.brand || '–', date: new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) })), cols: ['Customer', 'Phone', 'Employee', 'Product', 'Date'] },
    };
    const cfg = configs[kpiDrillOpen];
    if (!cfg) return null;
    const colKeys = { 'Customer': 'name', 'Phone': 'phone', 'Email': 'email', 'Employee': 'employee', 'Status': 'status', 'Date': 'date', 'Name': 'name', 'TL': 'tl', 'Location': 'location', 'Forms': 'forms', 'Product': 'product' };
    return (
      <Dialog open onClose={() => setKpiDrillOpen(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: cfg.color, fontWeight: 800 }}>
          {cfg.title} ({cfg.rows.length})
          <IconButton onClick={() => setKpiDrillOpen(null)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: cfg.color, color: '#fff' }}>#</TableCell>
                  {cfg.cols.map(c => <TableCell key={c} sx={{ fontWeight: 700, bgcolor: cfg.color, color: '#fff' }}>{c}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {cfg.rows.map((row, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{i + 1}</TableCell>
                    {cfg.cols.map(c => <TableCell key={c}>{row[colKeys[c]] ?? '–'}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKpiDrillOpen(null)} sx={{ color: cfg.color, fontWeight: 700 }}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  })()}

  </>
);

}

export default Dashboard;
