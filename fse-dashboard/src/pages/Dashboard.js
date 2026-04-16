import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, useTheme, Card, CardContent, Button, TextField, MenuItem
} from "@mui/material";
import { BRAND } from "../theme";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, ComposedChart, Line, Cell
} from "recharts";

const COLORS = ["#7c3aed","#10b981","#3b82f6","#f59e0b","#14b8a6","#ec4899","#0ea5e9","#ef4444"];

function OnboardVerifySection({ filteredForms, onboardVerifyMap, onboardVerifying, verifyDrillStatus, setVerifyDrillStatus }) {
  const onboardForms = filteredForms.filter(f => f.status === 'Ready for Onboarding');
  const getKey = (f) => {
    const p = (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim();
    return p ? `${f.customerNumber}__${p}` : f.customerNumber;
  };
  const fullyVerified = onboardForms.filter(f => onboardVerifyMap[getKey(f)]?.status === 'Fully Verified').length;
  const partiallyDone = onboardForms.filter(f => onboardVerifyMap[getKey(f)]?.status === 'Partially Done').length;
  const notFound      = onboardForms.filter(f => !onboardVerifyMap[getKey(f)] || onboardVerifyMap[getKey(f)]?.status === 'Not Found').length;

  const statusColor = { 'Fully Verified': '#2e7d32', 'Partially Done': '#f57f17', 'Not Found': '#888' };
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

  return (
    <Box sx={{ mb: 3 }}>
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
          { label: '– Not Found',      value: notFound,      color: '#888',    bg: '#f5f5f5', status: 'Not Found'      },
        ].map(k => (
          <Card key={k.label} onClick={() => setVerifyDrillStatus(verifyDrillStatus === k.status ? null : k.status)}
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

      {verifyDrillStatus && (() => {
        const color     = statusColor[verifyDrillStatus];
        const bg        = statusBg[verifyDrillStatus];
        const breakdown = buildBreakdown(verifyDrillStatus);
        return (
          <Box sx={{ mb: 3, p: 2, borderRadius: 3, bgcolor: bg, border: `1.5px solid ${color}30` }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ color }}>
                {verifyDrillStatus} — Product Breakdown
              </Typography>
              <Button size="small" onClick={() => setVerifyDrillStatus(null)} sx={{ color, fontWeight: 700, minWidth: 0 }}>✕ Close</Button>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 1.5 }}>
              {breakdown.map(([product, v]) => (
                <Card key={product} sx={{ borderRadius: 2, border: `1px solid ${color}30` }}>
                  <CardContent sx={{ py: 1, px: 1.5 }}>
                    <Typography variant="caption" fontWeight={700} sx={{ color, display: 'block' }}>{product}</Typography>
                    <Typography variant="h6" fontWeight={800} sx={{ color }}>{v.matched}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      of {v.total} · {Math.round((v.matched / v.total) * 100)}%
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
    </Box>
  );
}

function Dashboard() {
  const [forms,        setForms]        = useState([]);
  const [employees,    setEmployees]    = useState([]);
  const [tls,          setTls]          = useState([]);
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
      if (!emp || emp.reportingManager !== filterTL) return false;
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
    // Only show FSEs under the selected TL
    return [...new Set(
      employees
        .filter(e => e.reportingManager === filterTL)
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
    ? employees.filter(e => e.reportingManager === filterTL)
    : filterFSE
    ? employees.filter(e => e.newJoinerName === filterFSE)
    : employees;

  const totalEmployees  = filteredEmployees.length;
  const totalTLs        = filterTL ? 1 : tls.length;
  const activeEmployees = filteredEmployees.filter(e => e.status === 'Active').length;

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
  <TextField select size="small" label="Month" value={filterMonth}
    onChange={e => setFilterMonth(e.target.value)} sx={{ minWidth: 150 }}>
    <MenuItem value="">All Months</MenuItem>
    {monthOptions.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
  </TextField>

  <TextField select size="small" label="Team Leader" value={filterTL}
    onChange={e => { setFilterTL(e.target.value); setFilterFSE(''); }} sx={{ minWidth: 160 }}>
    <MenuItem value="">All TLs</MenuItem>
    {tlOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
  </TextField>

  <TextField select size="small" label="Employee" value={filterFSE}
    onChange={e => setFilterFSE(e.target.value)} sx={{ minWidth: 160 }}>
    <MenuItem value="">All Employees</MenuItem>
    {fseOptions.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
  </TextField>

  <TextField select size="small" label="Status" value={filterStatus}
    onChange={e => setFilterStatus(e.target.value)} sx={{ minWidth: 200 }}>
    <MenuItem value="">All Statuses</MenuItem>
    {statusOptions.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
  </TextField>

  <Button variant="outlined" size="small" onClick={() => {
    setFilterTL(''); setFilterFSE(''); setFilterStatus(''); setFilterMonth('');
    setDateFilter('all'); setFromDate(''); setToDate('');
  }} sx={{ fontWeight: 700 }}>Reset</Button>
</Box>

    {/* KPI Cards */}
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, mb: 3 }}>
      {[
        { label: 'Total Forms',       value: kpiData.totalForms,      color: '#7c3aed' },
        { label: 'Total Employees',   value: kpiData.totalEmployees,  color: '#3b82f6' },
        { label: 'Active Employees',  value: kpiData.activeEmployees, color: '#10b981' },
        { label: 'Total TLs',         value: kpiData.totalTLs,        color: '#f59e0b' },
        { label: 'Ready to Onboard',  value: kpiData.onboarding,      color: '#14b8a6' },
      ].map(k => (
        <Card key={k.label} variant="outlined" sx={{ borderRadius: 3 }}>
          <Box sx={{ height: 5, bgcolor: k.color, borderRadius: '3px 3px 0 0' }} />
          <CardContent>
            <Typography variant="body2" color="text.secondary">{k.label}</Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: k.color }}>{k.value}</Typography>
          </CardContent>
        </Card>
      ))}
    </Box>

    {/* Visit Status KPIs */}
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: showOnboardVerify ? 1 : 3 }}>
      {[
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
      ))}
    </Box>

    {/* Onboarding Verification Sub-KPIs — shown only when Ready for Onboarding is clicked */}
    {showOnboardVerify && <OnboardVerifySection
      filteredForms={filteredForms}
      onboardVerifyMap={onboardVerifyMap}
      onboardVerifying={onboardVerifying}
      verifyDrillStatus={verifyDrillStatus}
      setVerifyDrillStatus={setVerifyDrillStatus}
    />}

    {/* Product Breakdown + Daily Trend */}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>

      {/* Product Breakdown */}
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Forms by Product</Typography>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={Object.entries(kpiData.productMap).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))}
              margin={{ top: 8, right: 16, bottom: 60, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" angle={-30} textAnchor="end" tick={{ fontSize: 10 }} height={70} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {Object.keys(kpiData.productMap).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Trend */}
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Daily Form Submissions</Typography>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={kpiData.dailyTrend} margin={{ top: 8, right: 16, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" angle={-30} textAnchor="end" tick={{ fontSize: 9 }} height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Forms" fill={BRAND.primary} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
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
            <Tooltip formatter={(v) => [v, { forms: 'Forms', onboarding: 'Onboarding', verified: 'Verified', points: 'Points' }[chartMetric]]} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}
              fill={{ forms: BRAND.primary, onboarding: '#2e7d32', verified: '#10b981', points: '#f59e0b' }[chartMetric]}>
              {kpiData.topFSEs.map((_, i) => (
                <Cell key={i} fill={{ forms: BRAND.primary, onboarding: '#2e7d32', verified: '#10b981', points: '#f59e0b' }[chartMetric]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

  </Box>
);

}

export default Dashboard;
