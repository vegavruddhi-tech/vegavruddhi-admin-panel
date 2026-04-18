import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Card, CardContent, Typography, useTheme, Chip, IconButton, Tooltip as MuiTooltip,
  Collapse, Button, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
  TextField, CircularProgress, Autocomplete
} from "@mui/material";
import TableChartIcon from "@mui/icons-material/TableChart";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import CloseIcon from "@mui/icons-material/Close";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  ComposedChart, Line, Label,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, Brush
} from "recharts";

import { fetchData, updateRow } from "../services/api";
import FiltersBar from "../components/FiltersBar";
import TideDrillTable from "../components/TideDrillTable";
import MeetingTrend from "../components/MeetingTrend";
import { BRAND } from "../theme";

const COLORS = ["#7c3aed", "#10b981", "#3b82f6", "#f59e0b", "#14b8a6", "#ec4899", "#0ea5e9", "#ef4444"];
const PRODUCT_COLORS = ["#7c3aed","#10b981","#3b82f6","#f59e0b","#14b8a6","#ec4899","#0ea5e9","#ef4444","#f97316","#84cc16","#06b6d4","#8b5cf6"];

function toChartTheme(muiTheme) {
  const isDark = muiTheme.palette.mode === "dark";
  return {
    background: muiTheme.palette.background.default,
    card: isDark ? "#1e2d3d" : "#ffffff",
    text: muiTheme.palette.text.primary,
    grid: isDark ? "rgba(255,255,255,0.08)" : "rgba(26,92,56,0.15)",
    tooltipBg: isDark ? "#1e2d3d" : "#ffffff",
  };
}

// ── Onboarding Verification Sub-section (same as Overview) ─────────────────
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

// ── KPI strip ──────────────────────────────────────────────────────────────
function TideKPI({ rows, tideColumns, ct, openDrill, onboardCol }) {
  const KPI_COLORS = ["#7c3aed","#14b8a6","#10b981","#f59e0b","#3b82f6","#ec4899","#0ea5e9","#ef4444","#f97316","#84cc16","#06b6d4","#8b5cf6"];

  const [kpiModal, setKpiModal] = useState(null); // { label, col, color, chartData }

  const kpis = tideColumns.map((col, i) => ({
    label: col,
    col,
    value: rows.reduce((s, r) => s + (Number(r[col]) || 0), 0),
    color: KPI_COLORS[i % KPI_COLORS.length],
  }));

  const allAppliedIdx = kpis.findIndex((k) => k.label === "Tide (All applied cases)");
  const onboardIdx    = kpis.findIndex((k) => k.label === onboardCol);
  if (allAppliedIdx !== -1 && onboardIdx !== -1) {
    const applied = kpis[allAppliedIdx]?.value || 0;
    const ob      = kpis[onboardIdx]?.value    || 0;
    kpis.splice(onboardIdx + 1, 0, {
      label: "Pending (Not Onboarded)", col: null,
      value: Math.max(0, applied - ob), color: "#ef4444"
    });
  }

  const totalPoints = rows.reduce((s, r) => s + (Number(r["Total_Points"]) || 0), 0);
  kpis.push({ label: "Total Points (All Products)", col: "Total_Points", value: Math.round(totalPoints * 10) / 10, color: "#6366f1" });

  const openKpiModal = (k) => {
    if (!k.col) return; // Pending is computed, no raw col
    const chartData = rows
      .filter((r) => (Number(r[k.col]) || 0) > 0)
      .map((r) => ({ name: r["Name"] || "Unknown", tl: r["TL"] || "", value: Number(r[k.col]) || 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
    setKpiModal({ ...k, chartData });
  };

  const isDark = ct ? ct.tooltipBg === "#1f1f1f" : false;

  return (
    <>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 2, mb: 3 }}>
        {kpis.map((k) => (
          <Card key={k.label} variant="outlined"
            onClick={() => openKpiModal(k)}
            sx={{
              opacity: k.value === 0 ? 0.5 : 1,
              transition: "all 0.2s",
              cursor: k.col ? "pointer" : "default",
              borderColor: "divider",
              "&:hover": k.col ? {
                borderColor: k.color,
                transform: "translateY(-2px)",
                boxShadow: `0 4px 20px ${k.color}33`,
              } : {},
            }}>
            <CardContent sx={{ textAlign: "center", py: 1.5, px: 1.5 }}>
              <Typography variant="body2" color="text.secondary"
                sx={{ fontSize: 10, mb: 0.5, lineHeight: 1.3, minHeight: 28 }}>
                {k.label}
              </Typography>
              <Typography variant="h5"
                sx={{ color: k.value === 0 ? "text.disabled" : k.color, fontWeight: 800, fontSize: "1.6rem" }}>
                {k.value}
              </Typography>
              {k.col && k.value > 0 && (
                <Typography variant="caption" sx={{ opacity: 0.4, fontSize: 9 }}>click to explore</Typography>
              )}
              {k.value === 0 && (
                <Typography variant="caption" sx={{ opacity: 0.35, fontSize: 9 }}>no data this month</Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* KPI drill-down modal */}
      {kpiModal && (
        <Dialog open={!!kpiModal} onClose={() => setKpiModal(null)} maxWidth="md" fullWidth
          PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
          {/* Colored header */}
          <Box sx={{
            background: `linear-gradient(135deg, ${kpiModal.color}cc, ${kpiModal.color}66)`,
            px: 3, py: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <Box>
              <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700 }}>{kpiModal.label}</Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", fontSize: 12, mt: 0.3 }}>
                Top {kpiModal.chartData.length} employees · {kpiModal.value} total
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <MuiTooltip title="View full editable table">
                <IconButton size="small"
                  onClick={() => { setKpiModal(null); openDrill(`${kpiModal.label} — All Employees`, rows.filter((r) => (Number(r[kpiModal.col]) || 0) > 0).sort((a, b) => (Number(b[kpiModal.col]) || 0) - (Number(a[kpiModal.col]) || 0)), [kpiModal.col]); }}
                  sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}>
                  <TableChartIcon fontSize="small" />
                </IconButton>
              </MuiTooltip>
              <IconButton size="small" onClick={() => setKpiModal(null)}
                sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}>
                <FullscreenExitIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <DialogContent sx={{ p: 3, bgcolor: "background.paper" }}>
            {kpiModal.chartData.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>No employee data found.</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(300, kpiModal.chartData.length * 28)}>
                <BarChart
                  layout="vertical"
                  data={kpiModal.chartData}
                  margin={{ left: 10, right: 60, top: 10, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="kpiBarGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={kpiModal.color} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={kpiModal.color} stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} horizontal={false} />
                  <XAxis type="number" stroke={ct?.text} allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" stroke={ct?.text} width={140} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: ct?.tooltipBg, color: ct?.text, border: "none", borderRadius: 8 }}
                    formatter={(val, _, props) => [`${val}  (TL: ${props.payload.tl})`, kpiModal.label]}
                    cursor={{ fill: `${kpiModal.color}18` }}
                  />
                  <Bar dataKey="value" name={kpiModal.label} fill="url(#kpiBarGrad)"
                    radius={[0, 8, 8, 0]}
                    label={{ position: "right", fontSize: 11, fill: ct?.text, fontWeight: 700,
                      formatter: (v) => v > 0 ? v : "" }}
                  >
                    {kpiModal.chartData.map((_, i) => (
                      <Cell key={i}
                        fill={`hsla(${parseInt(kpiModal.color.slice(1), 16) % 360}, 70%, ${60 - i * 1.5}%, ${1 - i * 0.025})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ── Reusable chart card ─────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 0.5 }}>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{subtitle}</Typography>}
        {children}
      </CardContent>
    </Card>
  );
}

// ── Other Products KPI strip ────────────────────────────────────────────────
const OTHER_PRODUCT_COLS = [
  { col: "Vehicle Insurance",    label: "Vehicle Insurance",    color: "#10b981" },
  { col: "Vehicle Points Earned",label: "Vehicle Points Earned",color: "#3b82f6" },
  // { col: "Aditya Birla",         label: "Aditya Birla",         color: "#f59e0b" },
  // { col: "Airtel Payments Bank", label: "Airtel Payments Bank", color: "#ec4899" },
  // { col: "Hero FinCorp",         label: "Hero FinCorp",         color: "#7c3aed" },
];

function OtherProductKPI({ rows, openDrill }) {
  const [kpiModal, setKpiModal] = useState(null);

  const kpis = OTHER_PRODUCT_COLS.map((k) => ({
    ...k,
    value: rows.reduce((s, r) => s + (Number(r[k.col]) || 0), 0),
  }));
  const visibleKpis = kpis.filter(k => k.value > 0);

  const openKpiModal = (k) => {
    if (k.value === 0) return;
    const chartData = rows
      .filter((r) => r["Email ID"] && r["Email ID"].trim() !== "" && (Number(r[k.col]) || 0) > 0)
      .reduce((acc, r) => {
        const email = r["Email ID"].trim();
        const existing = acc.find((x) => x.email === email);
        if (existing) { existing.value += Number(r[k.col]) || 0; }
        else acc.push({ name: r["Name"] || email, email, tl: r["TL"] || "", value: Number(r[k.col]) || 0 });
        return acc;
      }, [])
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
    setKpiModal({ ...k, chartData });
  };

  return (
    <>
      <Box sx={{ mb: 1, mt: 1 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, mb: 1 }}>
          Other Products
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 2, mb: 3 }}>
          {kpis.filter(k => k.value > 0).map((k) => 
 (
            <Card key={k.col} variant="outlined"
              onClick={() => openKpiModal(k)}
              sx={{
                opacity: k.value === 0 ? 0.5 : 1,
                cursor: k.value > 0 ? "pointer" : "default",
                transition: "all 0.2s",
                "&:hover": k.value > 0 ? {
                  borderColor: k.color,
                  transform: "translateY(-2px)",
                  boxShadow: `0 4px 20px ${k.color}33`,
                } : {},
              }}>
              <CardContent sx={{ textAlign: "center", py: 1.5, px: 1.5 }}>
                <Typography variant="body2" color="text.secondary"
                  sx={{ fontSize: 10, mb: 0.5, lineHeight: 1.3, minHeight: 28 }}>
                  {k.label}
                </Typography>
                <Typography variant="h5"
                  sx={{ color: k.value === 0 ? "text.disabled" : k.color, fontWeight: 800, fontSize: "1.6rem" }}>
                  {k.value}
                </Typography>
                {k.value > 0
                  ? <Typography variant="caption" sx={{ opacity: 0.4, fontSize: 9 }}>click to explore</Typography>
                  : <Typography variant="caption" sx={{ opacity: 0.35, fontSize: 9 }}>no data this month</Typography>}
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {kpiModal && (
        <Dialog open={!!kpiModal} onClose={() => setKpiModal(null)} maxWidth="md" fullWidth
          PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
          <Box sx={{
            background: `linear-gradient(135deg, ${kpiModal.color}cc, ${kpiModal.color}66)`,
            px: 3, py: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <Box>
              <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700 }}>{kpiModal.label}</Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", fontSize: 12, mt: 0.3 }}>
                Top {kpiModal.chartData.length} employees · {kpiModal.value} total
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <MuiTooltip title="View full editable table">
                <IconButton size="small"
                  onClick={() => {
                    setKpiModal(null);
                    openDrill(`${kpiModal.label} — All Employees`,
                      rows.filter((r) => (Number(r[kpiModal.col]) || 0) > 0)
                          .sort((a, b) => (Number(b[kpiModal.col]) || 0) - (Number(a[kpiModal.col]) || 0)),
                      [kpiModal.col]);
                  }}
                  sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}>
                  <TableChartIcon fontSize="small" />
                </IconButton>
              </MuiTooltip>
              <IconButton size="small" onClick={() => setKpiModal(null)}
                sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}>
                <FullscreenExitIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          <DialogContent sx={{ p: 3, bgcolor: "background.paper" }}>
            {kpiModal.chartData.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>No employee data found.</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(300, kpiModal.chartData.length * 28)}>
                <BarChart layout="vertical" data={kpiModal.chartData} margin={{ left: 10, right: 60, top: 10, bottom: 10 }}>
                  <CartesianGrid stroke="rgba(0,0,0,0.08)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val, _, props) => [`${val}  (TL: ${props.payload.tl})`, kpiModal.label]}
                    cursor={{ fill: `${kpiModal.color}18` }}
                  />
                  <Bar dataKey="value" name={kpiModal.label} fill={kpiModal.color} radius={[0, 8, 8, 0]}
                    label={{ position: "right", fontSize: 11, fontWeight: 700, formatter: (v) => v > 0 ? v : "" }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ── Inline editable table (no dialog, renders directly in page) ────────────
const IDENTITY_COLS = ["Name", "Email ID", "TL", "Employee status"];

function InlineEditTable({ rows, editableCols, onReload }) {
  const [localRows, setLocalRows] = useState(() => rows.map((r) => ({ ...r })));
  const [editing, setEditing]     = useState({});
  const [saving, setSaving]       = useState({});
  const [saved, setSaved]         = useState({});
  const [errors, setErrors]       = useState({});

  // Re-sync when rows change (month switch / filter change)
  useEffect(() => { setLocalRows(rows.map((r) => ({ ...r }))); setEditing({}); setSaved({}); setErrors({}); }, [rows]);

  const displayCols = [...IDENTITY_COLS, ...editableCols];
  const k = (i, col) => `${i}_${col}`;

  const handleSave = async (i, col, row) => {
    const key = k(i, col);
    const val = editing[key];
    if (val === undefined || val === "") return;
    setSaving((p) => ({ ...p, [key]: true }));
    try {
      const res = await updateRow(row["Email ID"], col, Number(val));
      if (res.success) {
        setLocalRows((prev) => { const n = [...prev]; n[i] = { ...n[i], [col]: Number(val) }; return n; });
        setSaved((p) => ({ ...p, [key]: true }));
        setTimeout(() => setSaved((p) => ({ ...p, [key]: false })), 2000);
        setEditing((p) => { const n = { ...p }; delete n[key]; return n; });
        onReload(); // refresh cache in background
      } else {
        setErrors((p) => ({ ...p, [key]: res.error || "Failed" }));
      }
    } catch { setErrors((p) => ({ ...p, [key]: "Network error" })); }
    setSaving((p) => ({ ...p, [key]: false }));
  };

  if (localRows.length === 0) return <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>No records.</Typography>;

  return (
    <Box sx={{ overflowX: "auto", maxHeight: 420, overflowY: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>#</TableCell>
            {displayCols.map((c) => (
              <TableCell key={c} sx={{ fontWeight: 700, fontSize: 11, whiteSpace: "nowrap", bgcolor: editableCols.includes(c) ? "action.hover" : undefined }}>
                {c}
                {editableCols.includes(c) && <Typography variant="caption" sx={{ display: "block", opacity: 0.45, fontSize: 9 }}>editable</Typography>}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {localRows.map((row, i) => (
            <TableRow key={i} hover>
              <TableCell sx={{ fontSize: 11, color: "text.secondary" }}>{i + 1}</TableCell>
              {displayCols.map((col) => {
                const key = k(i, col);
                const isEditable = editableCols.includes(col);
                const isEditing  = editing[key] !== undefined;
                return (
                  <TableCell key={col} sx={{ whiteSpace: "nowrap", fontSize: 12 }}>
                    {isEditable ? (
                      isEditing ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <TextField size="small" type="number" value={editing[key]}
                            onChange={(e) => setEditing((p) => ({ ...p, [key]: e.target.value }))}
                            sx={{ width: 72 }} autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter") handleSave(i, col, row); if (e.key === "Escape") setEditing((p) => { const n = { ...p }; delete n[key]; return n; }); }}
                          />
                          {saving[key]
                            ? <CircularProgress size={14} />
                            : <Button size="small" variant="contained" sx={{ minWidth: 0, px: 1, fontSize: 11 }} onClick={() => handleSave(i, col, row)}>✓</Button>}
                          <Button size="small" sx={{ minWidth: 0, px: 0.5, fontSize: 11 }} onClick={() => setEditing((p) => { const n = { ...p }; delete n[key]; return n; })}>✕</Button>
                          {errors[key] && <Typography color="error" variant="caption" sx={{ fontSize: 10 }}>{errors[key]}</Typography>}
                        </Box>
                      ) : (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer" }}
                          onClick={() => setEditing((p) => ({ ...p, [key]: row[col] ?? 0 }))}>
                          {saved[key]
                            ? <Chip label="✓" color="success" size="small" sx={{ height: 18, fontSize: 10 }} />
                            : <strong>{row[col] ?? 0}</strong>}
                          <span style={{ fontSize: 10, opacity: 0.35 }}>✏️</span>
                        </Box>
                      )
                    ) : (
                      String(row[col] ?? "—")
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export default function ProductDashboard() {
  const muiTheme = useTheme();
  const ct = useMemo(() => toChartTheme(muiTheme), [muiTheme]);

  // ── Google Sheets data (for charts below) ──────────────────────────────
  const [raw, setRaw] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [filters, setFilters] = useState({ tl: "", employee: "", status: "", employment: "" });
  const [productMeta, setProductMeta] = useState({ product_columns: [], product_totals: {}, product_groups: {} });
  const [onboardColMap, setOnboardColMap] = useState({ byMonth: {}, default: "Tide OB with PP" });

  // ── MongoDB data (for top section KPIs) ────────────────────────────────
  const EMP_API = process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api';
  const [mongoForms,     setMongoForms]     = useState([]);
  const [mongoEmployees, setMongoEmployees] = useState([]);
  const [mongoTls,       setMongoTls]       = useState([]);

  // Top section filters (MongoDB)
  const [topDateFilter,   setTopDateFilter]   = useState('all');
  const [topFromDate,     setTopFromDate]     = useState('');
  const [topToDate,       setTopToDate]       = useState('');
  const [topFilterTL,     setTopFilterTL]     = useState('');
  const [topFilterFSE,    setTopFilterFSE]    = useState('');
  const [topFilterStatus, setTopFilterStatus] = useState('');
  const [topFilterMonth,  setTopFilterMonth]  = useState('');

  // Onboarding verification state
  const [showOnboardVerify,  setShowOnboardVerify]  = useState(false);
  const [onboardVerifying,   setOnboardVerifying]   = useState(false);
  const [onboardVerifyMap,   setOnboardVerifyMap]   = useState({});
  const [verifyDrillStatus,  setVerifyDrillStatus]  = useState(null);
  const [globalVerifyMap,    setGlobalVerifyMap]    = useState({});

  // drill-down state
  const [drill, setDrill] = useState({ open: false, title: "", rows: [], editableCols: undefined });
  const openDrill = (title, rows, editableCols) => setDrill({ open: true, title, rows, editableCols: editableCols || undefined });
  const closeDrill = () => setDrill((p) => ({ ...p, open: false }));

  // MongoDB drill-down state (for custom chart)
  const [mongoDrill, setMongoDrill] = useState(null); // { title, data: [{name, tl, ...products}], cols }
  const openMongoDrill = (title, data, cols) => setMongoDrill({ title, data, cols });
  const closeMongoDrill = () => setMongoDrill(null);

  // employee profile popup state (custom chart bar click)
  const [empProfile, setEmpProfile] = useState(null); // { name, email, tl, status, employment, kpis: [{label, value, color}] }

  const openEmpProfile = (employeeName) => {
    // Aggregate all rows for this employee across the current filtered data
    const empRows = rows.filter((r) => r["Name"] === employeeName);
    if (empRows.length === 0) return;
    const ref = empRows[0];
    const allCols = allProductCols.length > 0 ? allProductCols : selectedCols;
    const KPI_COLORS = ["#7c3aed","#10b981","#3b82f6","#f59e0b","#14b8a6","#ec4899","#0ea5e9","#ef4444","#f97316","#84cc16","#06b6d4","#8b5cf6"];
    const kpis = allCols
      .map((col, i) => ({
        label: col,
        value: empRows.reduce((s, r) => s + (Number(r[col]) || 0), 0),
        color: KPI_COLORS[i % KPI_COLORS.length],
      }))
      .filter((k) => k.value > 0)
      .sort((a, b) => b.value - a.value);
    const totalPoints = empRows.reduce((s, r) => s + (Number(r["Total_Points"]) || 0), 0);
    setEmpProfile({
      name: employeeName,
      email: ref["Email ID"] || "",
      tl: ref["TL"] || "",
      status: ref["Employee status"] || "",
      employment: ref["Employment type"] || "",
      totalPoints: Math.round(totalPoints * 10) / 10,
      kpis,
    });
  };

  // ── Custom chart column selector state ──────────────────────────────────
  const [selectedCols, setSelectedCols] = useState([]);
  const [selectorOpen, setSelectorOpen] = useState(true);
  const [chartZoomed, setChartZoomed] = useState(340);
  const [chartFullscreen, setChartFullscreen] = useState(false);
  const [showCustomTable, setShowCustomTable] = useState(false);
  const [groupBy, setGroupBy] = useState("employee"); // "employee" | "tl"
  const [dateFilter, setDateFilter] = useState('all');
  const [toDate, setToDate]         = useState('');
  const [fromDate, setFromDate]     = useState('');

  const toggleCol = (col) =>
    setSelectedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );

  const load = async () => {
    const result = await fetchData();
    const safeRaw = Array.isArray(result) ? result : result.raw || [];
    setRaw(safeRaw);
    if (result && !Array.isArray(result)) {
      setProductMeta({
        product_columns: result.product_columns || [],
        product_totals: result.product_totals || {},
        product_groups: result.product_groups || {}
      });
      setOnboardColMap({
        byMonth: result.onboard_column_by_month || {},
        default: result.default_onboard_column || "Tide OB with PP",
      });
    }
  };

  const loadMongoData = async () => {
    try {
      const res = await fetch(`${EMP_API}/forms/admin/overview`);
      const data = res.ok ? await res.json() : { forms: [], employees: [], tls: [] };
      const forms = data.forms || [];
      setMongoForms(forms);
      setMongoEmployees(data.employees || []);
      setMongoTls(data.tls || []);

      // ── Auto-fetch verification for all forms in background ──────────
      if (forms.length > 0) {
        const getP = (f) => (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim();
        const BATCH = 50;
        const batches = [];
        for (let i = 0; i < forms.length; i += BATCH) batches.push(forms.slice(i, i + BATCH));
        try {
          const results = await Promise.all(batches.map(batch => {
            const phones   = batch.map(f => f.customerNumber).join(',');
            const names    = batch.map(f => encodeURIComponent(f.customerName || '')).join(',');
            const products = batch.map(f => encodeURIComponent(getP(f))).join(',');
            const months   = batch.map(f => encodeURIComponent(
              new Date(f.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' })
            )).join(',');
            return fetch(
              `${EMP_API}/verify/bulk-admin?phones=${encodeURIComponent(phones)}&names=${names}&products=${products}&months=${months}`
            ).then(r => r.ok ? r.json() : {}).catch(() => ({}));
          }));
          setGlobalVerifyMap(Object.assign({}, ...results));
        } catch { /* ignore verify errors */ }
      }
    } catch (err) {
      console.error('Product page MongoDB load error:', err);
    }
  };

  useEffect(() => {
    load();
    loadMongoData();
    const iv = setInterval(load, 120000);
    const iv2 = setInterval(loadMongoData, 120000);
    return () => { clearInterval(iv); clearInterval(iv2); };
  }, []);

  // ── MongoDB: filtered forms for top section ───────────────────────────────
  const topFilteredForms = useMemo(() => {
    const now        = new Date();
    const today      = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart  = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return mongoForms.filter(f => {
      const d = new Date(f.createdAt);
      if (topDateFilter === 'today'  && d < today)      return false;
      if (topDateFilter === 'week'   && d < weekStart)  return false;
      if (topDateFilter === 'month'  && d < monthStart) return false;
      if (topDateFilter === 'custom') {
        if (topFromDate && d < new Date(topFromDate))                    return false;
        if (topToDate   && d > new Date(topToDate + 'T23:59:59'))        return false;
      }
      if (topFilterMonth) {
        const m = new Date(f.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (m !== topFilterMonth) return false;
      }
      if (topFilterTL) {
        const emp = mongoEmployees.find(e => e.newJoinerName === f.employeeName);
        if (!emp || (emp.reportingManager || '').toLowerCase().trim() !== topFilterTL.toLowerCase().trim()) return false;
      }
      if (topFilterFSE    && f.employeeName !== topFilterFSE)    return false;
      if (topFilterStatus && f.status       !== topFilterStatus) return false;
      return true;
    });
  }, [mongoForms, topDateFilter, topFromDate, topToDate, topFilterMonth, topFilterTL, topFilterFSE, topFilterStatus, mongoEmployees]);

  // ── MongoDB: filter options ────────────────────────────────────────────
  const topMonthOptions = useMemo(() => {
    const seen = new Set();
    mongoForms.forEach(f => {
      if (f.createdAt) {
        const m = new Date(f.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' });
        seen.add(m);
      }
    });
    return [...seen].sort();
  }, [mongoForms]);

  const topTlOptions  = useMemo(() => [...new Set(mongoTls.map(t => t.name).filter(Boolean))].sort(), [mongoTls]);
  const topFseOptions = useMemo(() => {
    if (topFilterTL) {
      return [...new Set(
        mongoEmployees
          .filter(e => (e.reportingManager || '').toLowerCase().trim() === topFilterTL.toLowerCase().trim())
          .map(e => e.newJoinerName).filter(Boolean)
      )].sort();
    }
    return [...new Set(mongoEmployees.map(e => e.newJoinerName).filter(Boolean))].sort();
  }, [mongoEmployees, topFilterTL]);
  const topStatusOptions = ['Ready for Onboarding', 'Not Interested', 'Try but not done due to error', 'Need to visit again'];

  // ── MongoDB: dynamic product KPIs ─────────────────────────────────────
  const productKpis = useMemo(() => {
    const map = {};
    topFilteredForms.forEach(f => {
      const raw = f.formFillingFor || f.tideProduct || f.brand || 'Other';
      const product = raw.toLowerCase() === 'msme' ? 'Tide MSME' : raw;
      if (!map[product]) map[product] = 0;
      map[product]++;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([product, count], i) => ({ product, count, color: PRODUCT_COLORS[i % PRODUCT_COLORS.length] }));
  }, [topFilteredForms]);

  // ── MongoDB: visit status counts ──────────────────────────────────────
  const visitStatusCounts = useMemo(() => ({
    onboarding: topFilteredForms.filter(f => f.status === 'Ready for Onboarding').length,
    notInt:     topFilteredForms.filter(f => f.status === 'Not Interested').length,
    tryErr:     topFilteredForms.filter(f => f.status === 'Try but not done due to error').length,
    revisit:    topFilteredForms.filter(f => f.status === 'Need to visit again').length,
  }), [topFilteredForms]);

  // ── Per-product daily trend data (Ready / Fully Verified / Partially Done) ─
  const getVerifyKey = (f) => {
    const p = (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim();
    return p ? `${f.customerNumber}__${p}` : f.customerNumber;
  };

  const productDailyData = useMemo(() => {
    // Get all unique products from filtered forms
    const productSet = new Set();
    topFilteredForms.forEach(f => {
      const raw = f.formFillingFor || f.tideProduct || f.brand || '';
      if (raw) {
        const normalized = raw.toLowerCase() === 'msme' ? 'Tide MSME' : raw;
        productSet.add(normalized);
      }
    });

    const result = {};

    productSet.forEach(product => {
      // Get forms for this product
      const productForms = topFilteredForms.filter(f => {
        const raw = f.formFillingFor || f.tideProduct || f.brand || '';
        const normalized = raw.toLowerCase() === 'msme' ? 'Tide MSME' : raw;
        return normalized === product;
      });

      // Build day-by-day map
      const dayMap = {};
      productForms.forEach(f => {
        const day = new Date(f.createdAt).toISOString().slice(0, 10);
        if (!dayMap[day]) dayMap[day] = { date: day, onboarding: 0, fullyVerified: 0, partiallyDone: 0 };

        if (f.status === 'Ready for Onboarding') {
          dayMap[day].onboarding++;
          const vStatus = globalVerifyMap[getVerifyKey(f)]?.status;
          if (vStatus === 'Fully Verified')  dayMap[day].fullyVerified++;
          if (vStatus === 'Partially Done')  dayMap[day].partiallyDone++;
        }
      });

      // Sort by date
      const chartData = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

      // Only include product if it has at least one onboarding form
      if (chartData.some(d => d.onboarding > 0)) {
        result[product] = chartData;
      }
    });

    return result;
  }, [topFilteredForms, globalVerifyMap]);

  // ── MongoDB: dynamic product columns and groups for Custom Chart ──────
  const mongoProductMeta = useMemo(() => {
    const productSet = new Set();
    topFilteredForms.forEach(f => {
      const raw = f.formFillingFor || f.tideProduct || f.brand || '';
      if (raw) {
        const normalized = raw.toLowerCase() === 'msme' ? 'Tide MSME' : raw;
        productSet.add(normalized);
      }
    });
    
    const allProducts = Array.from(productSet).sort();
    
    // Group products by category
    const groups = {};
    allProducts.forEach(p => {
      const lower = p.toLowerCase();
      if (lower.includes('tide')) {
        if (!groups['Tide Products']) groups['Tide Products'] = { columns: [] };
        groups['Tide Products'].columns.push(p);
      } else if (lower.includes('insurance') || lower.includes('vehicle')) {
        if (!groups['Insurance']) groups['Insurance'] = { columns: [] };
        groups['Insurance'].columns.push(p);
      } else if (lower.includes('pinelab') || lower.includes('pine lab')) {
        if (!groups['PineLab']) groups['PineLab'] = { columns: [] };
        groups['PineLab'].columns.push(p);
      } else {
        if (!groups['Other Products']) groups['Other Products'] = { columns: [] };
        groups['Other Products'].columns.push(p);
      }
    });

    return {
      product_columns: allProducts,
      product_groups: groups
    };
  }, [topFilteredForms]);

  // ── MongoDB: aggregated data for Custom Chart (by product) ────────────
  const mongoAggregatedData = useMemo(() => {
    const employeeMap = {};
    const tlMap = {};

    topFilteredForms.forEach(f => {
      const product = (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase() === 'msme' 
        ? 'Tide MSME' 
        : (f.formFillingFor || f.tideProduct || f.brand || 'Other');
      
      const empName = f.employeeName || 'Unknown';
      const emp = mongoEmployees.find(e => e.newJoinerName === empName);
      const tlName = emp?.reportingManager || 'Unknown';

      // Aggregate by employee
      if (!employeeMap[empName]) {
        employeeMap[empName] = { name: empName, tl: tlName };
        mongoProductMeta.product_columns.forEach(col => { employeeMap[empName][col] = 0; });
      }
      if (mongoProductMeta.product_columns.includes(product)) {
        employeeMap[empName][product]++;
      }

      // Aggregate by TL
      if (!tlMap[tlName]) {
        tlMap[tlName] = { name: tlName };
        mongoProductMeta.product_columns.forEach(col => { tlMap[tlName][col] = 0; });
      }
      if (mongoProductMeta.product_columns.includes(product)) {
        tlMap[tlName][product]++;
      }
    });

    return {
      byEmployee: Object.values(employeeMap),
      byTL: Object.values(tlMap)
    };
  }, [topFilteredForms, mongoEmployees, mongoProductMeta.product_columns]);

  // ── Detect available months from _month tag ──────────────────────────────
  const monthOptions = useMemo(() => {
    const seen = new Set();
    const result = [];
    (Array.isArray(raw) ? raw : []).forEach((row) => {
      const m = row["_month"];
      if (m && !seen.has(m)) { seen.add(m); result.push(m); }
    });
    // Sort chronologically using month name parsing
    result.sort((a, b) => {
      const parse = (s) => { const [mon, yr] = s.split(" "); return parseInt(yr) * 100 + new Date(`${mon} 1`).getMonth(); };
      return parse(a) - parse(b);
    });
    return result;
  }, [raw]);

  // ── Auto-select latest month on first load ─────────────────────────────────
  useEffect(() => {
    if (selectedMonth || monthOptions.length === 0) return;
    setSelectedMonth(monthOptions[monthOptions.length - 1]);
  }, [monthOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── filtered rows — filter by _month tag, then by other filters ───────────
  const rows = useMemo(() => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return (Array.isArray(raw) ? raw : []).filter((row) => {
    if (selectedMonth && row["_month"] !== selectedMonth) return false;
    if (filters.tl && row["TL"] !== filters.tl) return false;
    if (filters.employee && row["Name"] !== filters.employee) return false;
    if (filters.status && row["Employee status"] !== filters.status) return false;
    if (filters.employment && row["Employment type"] !== filters.employment) return false;
    if (dateFilter !== 'all') {
      const dateCols = Object.keys(row).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k) && row[k] > 0);
      if (dateCols.length === 0) return false;
      const rowDate = new Date(dateCols[0]);
      if (dateFilter === 'today' && rowDate < today) return false;
      if (dateFilter === 'week'  && rowDate < weekStart) return false;
      if (dateFilter === 'month' && rowDate < monthStart) return false;
      if (dateFilter === 'custom') {
        if (fromDate && rowDate < new Date(fromDate)) return false;
        if (toDate   && rowDate > new Date(toDate + 'T23:59:59')) return false;
      }
    }
    return true;
  });
}, [raw, filters, selectedMonth, dateFilter, fromDate, toDate]);


  // ── Onboard column — changes per month based on backend config ───────────
  // Hardcoded fallback in case backend hasn't restarted yet
  const FRONTEND_ONBOARD_FALLBACK = {
    "January 2026":  "Tide OB with PP",
    "February 2026": "Tide OB with PP",
    "March 2026":    "Tide OB with PP + 5K QR Load + 4 Txns",
  };
  const onboardCol =
    (onboardColMap.byMonth && onboardColMap.byMonth[selectedMonth]) ||
    FRONTEND_ONBOARD_FALLBACK[selectedMonth] ||
    onboardColMap.default ||
    "Tide OB with PP";

  // // ── CHART 1: Tide OB vs OB with PP by TL (pending per TL) ─────────────────
  // const tlPendingData = useMemo(() => {
  //   const map = {};
  //   rows.forEach((r) => {
  //     const tl = r["TL"] || "Unknown";
  //     if (!map[tl]) map[tl] = { tl, ob: 0, pp: 0 };
  //     map[tl].ob += Number(r["Tide OB"]) || 0;
  //     map[tl].pp += Number(r["Tide OB with PP"]) || 0;
  //   });
  //   return Object.values(map)
  //     .map((d) => ({ ...d, pending: d.ob - d.pp }))
  //     .filter((d) => d.ob > 0)
  //     .sort((a, b) => b.pending - a.pending);
  // }, [rows]);

  // // ── CHART 2: Conversion rate OB → PP per TL ───────────────────────────────
  // const conversionData = useMemo(() => {
  //   return tlPendingData
  //     .filter((d) => d.ob > 0)
  //     .map((d) => ({
  //       tl: d.tl,
  //       rate: Math.round((d.pp / d.ob) * 100),
  //       ob: d.ob,
  //       pp: d.pp
  //     }))
  //     .sort((a, b) => b.rate - a.rate);
  // }, [tlPendingData]);

  // ── CHART 3: Offer Revoked employees who still have Tide OB ───────────────
  const revokedWithTide = useMemo(() => {
    return rows.filter(
      (r) => r["Offer letter status"] === "Offer Revoked" && (Number(r["Tide OB"]) || 0) > 0
    );
  }, [rows]);

  const revokedByTL = useMemo(() => {
    const map = {};
    revokedWithTide.forEach((r) => {
      const tl = r["TL"] || "Unknown";
      map[tl] = (map[tl] || 0) + 1;
    });
    return Object.entries(map).map(([tl, count]) => ({ tl, count })).sort((a, b) => b.count - a.count);
  }, [revokedWithTide]);

  // ── CHART 1 data: All Applied Cases vs Correct Referral Code by TL ─────────
  const appliedVsRefData = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const tl = r["TL"] || "Unknown";
      if (!map[tl]) map[tl] = { tl, allApplied: 0, correctRef: 0 };
      map[tl].allApplied += Number(r["Tide (All applied cases)"]) || 0;
      map[tl].correctRef += Number(r["Tide OB(with correct ref. code)"]) || 0;
    });
    return Object.values(map).filter((d) => d.allApplied > 0).sort((a, b) => b.allApplied - a.allApplied);
  }, [rows]);

  // Rows sorted to match graph order (by allApplied desc, then by TL order in chart)
  const appliedVsRefTableRows = useMemo(() => {
    const tlOrder = appliedVsRefData.map((d) => d.tl);
    return rows
      .filter((r) => (Number(r["Tide (All applied cases)"]) || 0) > 0)
      .sort((a, b) => {
        const ai = tlOrder.indexOf(a["TL"] || "Unknown");
        const bi = tlOrder.indexOf(b["TL"] || "Unknown");
        if (ai !== bi) return ai - bi;
        return (Number(b["Tide (All applied cases)"]) || 0) - (Number(a["Tide (All applied cases)"]) || 0);
      });
  }, [rows, appliedVsRefData]);

  // ── CHART 2 data: Onboarded Tide — All Applied Cases vs onboard col by TL ─
  const onboardedTideData = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const tl = r["TL"] || "Unknown";
      if (!map[tl]) map[tl] = { tl, allApplied: 0, obWithPP: 0 };
      map[tl].allApplied += Number(r["Tide (All applied cases)"]) || 0;
      map[tl].obWithPP  += Number(r[onboardCol]) || 0;
    });
    return Object.values(map)
      .filter((d) => d.allApplied > 0)
      .map((d) => ({ ...d, gap: d.allApplied - d.obWithPP }))
      .sort((a, b) => b.allApplied - a.allApplied);
  }, [rows, onboardCol]);

  // ── CHART 3 data: UPI Done vs PPI by Employee (independent, not related) ──
  const upiVsPpiData = useMemo(() => {
    return rows
      .filter((r) => (Number(r["Tide OB (UPI - BC011+QRPPVV01)"]) || 0) > 0 || (Number(r["Tide - PPI"]) || 0) > 0)
      .map((r) => ({
        name:    r["Name"] || "Unknown",
        tl:      r["TL"]   || "Unknown",
        upi:     Number(r["Tide OB (UPI - BC011+QRPPVV01)"]) || 0,
        ppi:     Number(r["Tide - PPI"]) || 0,
      }))
      .sort((a, b) => (b.upi + b.ppi) - (a.upi + a.ppi))
      .slice(0, 20);
  }, [rows]);

  const upiVsPpiTableRows = useMemo(() => {
    const nameOrder = upiVsPpiData.map((d) => d.name);
    return rows
      .filter((r) => (Number(r["Tide OB (UPI - BC011+QRPPVV01)"]) || 0) > 0 || (Number(r["Tide - PPI"]) || 0) > 0)
      .sort((a, b) => {
        const ai = nameOrder.indexOf(a["Name"] || "Unknown");
        const bi = nameOrder.indexOf(b["Name"] || "Unknown");
        if (ai !== -1 && bi !== -1) return ai - bi;
        return (Number(b["Tide OB (UPI - BC011+QRPPVV01)"]) || 0) - (Number(a["Tide OB (UPI - BC011+QRPPVV01)"]) || 0);
      });
  }, [rows, upiVsPpiData]);

  const onboardedTideTableRows = useMemo(() => {
    const tlOrder = onboardedTideData.map((d) => d.tl);
    return rows
      .filter((r) => (Number(r["Tide (All applied cases)"]) || 0) > 0)
      .sort((a, b) => {
        const ai = tlOrder.indexOf(a["TL"] || "Unknown");
        const bi = tlOrder.indexOf(b["TL"] || "Unknown");
        if (ai !== bi) return ai - bi;
        return (Number(b["Tide (All applied cases)"]) || 0) - (Number(a["Tide (All applied cases)"]) || 0);
      });
  }, [rows, onboardedTideData]);
  // ── Tide columns — derived from backend product_columns, filtered to Tide ──
  const tideColumns = useMemo(() => {
    const detected = productMeta.product_columns.filter((c) => c.toLowerCase().includes("tide"));
    // If backend hasn't loaded yet, fall back to empty (KPI/charts will show 0)
    return detected;
  }, [productMeta.product_columns]);

  // ── All product columns (all groups) for the column selector ─────────────
  const allProductCols = useMemo(() => mongoProductMeta.product_columns, [mongoProductMeta.product_columns]);

  // ── Custom chart data — grouped by Employee or TL based on groupBy state ─
  const customChartData = useMemo(() => {
    if (selectedCols.length === 0) return [];
    
    const sourceData = groupBy === "tl" ? mongoAggregatedData.byTL : mongoAggregatedData.byEmployee;
    
    return sourceData
      .filter((d) => selectedCols.some((c) => (d[c] || 0) > 0))
      .map(d => {
        const result = { key: d.name, tl: d.tl || '', name: d.name };
        selectedCols.forEach(c => { result[c] = d[c] || 0; });
        return result;
      })
      .sort((a, b) => {
        const sumA = selectedCols.reduce((s, c) => s + (a[c] || 0), 0);
        const sumB = selectedCols.reduce((s, c) => s + (b[c] || 0), 0);
        return sumB - sumA;
      });
  }, [selectedCols, groupBy, mongoAggregatedData]);

  // ── CHART 4 donut: dynamic product breakdown from detected Tide columns ───
  const productBreakdown = useMemo(() => {
    const DONUT_COLORS = ["#7c3aed","#14b8a6","#10b981","#f59e0b","#3b82f6","#ec4899","#0ea5e9","#ef4444","#f97316","#84cc16"];
    return tideColumns.map((col, i) => ({
      name:  col.replace(/^Tide\s*/i, "").trim() || col,  // strip "Tide " prefix for shorter labels
      col,
      value: rows.reduce((s, r) => s + (Number(r[col]) || 0), 0),
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    })).filter((d) => d.value > 0);
  }, [tideColumns, rows]);

  // ── CHART 5: Employees with pending transactions (OB > PP) ────────────────
  const pendingEmployees = useMemo(() => {
    return rows
      .filter((r) => (Number(r["Tide OB"]) || 0) > (Number(r["Tide OB with PP"]) || 0))
      .map((r) => ({
        ...r,
        pending: (Number(r["Tide OB"]) || 0) - (Number(r["Tide OB with PP"]) || 0)
      }))
      .sort((a, b) => b.pending - a.pending);
  }, [rows]);

  // ── CHART 5 data: Correct Ref Code vs Incorrect Ref Code by TL ─────────────
  const refCodeData = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const tl = r["TL"] || "Unknown";
      if (!map[tl]) map[tl] = { tl, correct: 0, incorrect: 0 };
      map[tl].correct   += Number(r["Tide OB(with correct ref. code)"]) || 0;
      map[tl].incorrect += Number(r["Tide - incorrect referral code"]) || 0;
    });
    return Object.values(map)
      .filter((d) => d.correct > 0 || d.incorrect > 0)
      .map((d) => ({
        ...d,
        total:       d.correct + d.incorrect,
        correctPct:  d.correct + d.incorrect > 0 ? Math.round((d.correct / (d.correct + d.incorrect)) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  const refCodeTableRows = useMemo(() => {
    const tlOrder = refCodeData.map((d) => d.tl);
    return rows
      .filter((r) => (Number(r["Tide OB(with correct ref. code)"]) || 0) > 0 || (Number(r["Tide - incorrect referral code"]) || 0) > 0)
      .sort((a, b) => {
        const ai = tlOrder.indexOf(a["TL"] || "Unknown");
        const bi = tlOrder.indexOf(b["TL"] || "Unknown");
        if (ai !== bi) return ai - bi;
        return (Number(b["Tide OB(with correct ref. code)"]) || 0) - (Number(a["Tide OB(with correct ref. code)"]) || 0);
      });
  }, [rows, refCodeData]);

  // ── CHART 6 data: Correct vs Incorrect Referral Code by Employee ────────────
  const refCodeByEmpData = useMemo(() => {
    return rows
      .filter((r) => (Number(r["Tide OB(with correct ref. code)"]) || 0) > 0 || (Number(r["Tide - incorrect referral code"]) || 0) > 0)
      .map((r) => {
        const correct   = Number(r["Tide OB(with correct ref. code)"]) || 0;
        const incorrect = Number(r["Tide - incorrect referral code"]) || 0;
        const total     = correct + incorrect;
        return {
          name:       r["Name"] || "Unknown",
          tl:         r["TL"]   || "Unknown",
          correct,
          incorrect,
          total,
          correctPct: total > 0 ? Math.round((correct / total) * 100) : 0
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);
  }, [rows]);

  const refCodeByEmpTableRows = useMemo(() => {
    const nameOrder = refCodeByEmpData.map((d) => d.name);
    return rows
      .filter((r) => (Number(r["Tide OB(with correct ref. code)"]) || 0) > 0 || (Number(r["Tide - incorrect referral code"]) || 0) > 0)
      .sort((a, b) => {
        const ai = nameOrder.indexOf(a["Name"] || "Unknown");
        const bi = nameOrder.indexOf(b["Name"] || "Unknown");
        if (ai !== -1 && bi !== -1) return ai - bi;
        return (Number(b["Tide OB(with correct ref. code)"]) || 0) - (Number(a["Tide OB(with correct ref. code)"]) || 0);
      });
  }, [rows, refCodeByEmpData]);

  // ── CHART 7 data: Tide MSME by Employee ──────────────────────────────────
  const msmData = useMemo(() => {
    return rows
      .filter((r) => (Number(r["Tide MSME"]) || 0) > 0)
      .map((r) => ({
        name:  r["Name"] || "Unknown",
        tl:    r["TL"]   || "Unknown",
        msme:  Number(r["Tide MSME"]) || 0,
      }))
      .sort((a, b) => b.msme - a.msme)
      .slice(0, 15);
  }, [rows]);

  // ── CHART 8 data: Tide Insurance by Employee ──────────────────────────────
  const insData = useMemo(() => {
    return rows
      .filter((r) => (Number(r["Tide Insurance"]) || 0) > 0)
      .map((r) => ({
        name: r["Name"] || "Unknown",
        tl:   r["TL"]   || "Unknown",
        ins:  Number(r["Tide Insurance"]) || 0,
      }))
      .sort((a, b) => b.ins - a.ins)
      .slice(0, 15);
  }, [rows]);

  // ── CHART 8b data: OB with PP + 5K QR Load + 4 Txns by Employee ─────────
  const qrData = useMemo(() => {
    return rows
      .filter((r) => (Number(r["Tide OB with PP + 5K QR Load + 4 Txns"]) || 0) > 0)
      .map((r) => ({
        name: r["Name"] || "Unknown",
        tl:   r["TL"]   || "Unknown",
        qr:   Number(r["Tide OB with PP + 5K QR Load + 4 Txns"]) || 0,
      }))
      .sort((a, b) => b.qr - a.qr)
      .slice(0, 15);
  }, [rows]);

  // ── CHART 9 data: All Tide product columns — count + % of All Applied Cases ──
  // Fully dynamic — uses tideColumns detected by backend, no hardcoding needed
  const allProductsData = useMemo(() => {
    const totalApplied = rows.reduce((s, r) => s + (Number(r["Tide (All applied cases)"]) || 0), 0);
    return tideColumns.map((col) => {
      const sales = rows.reduce((s, r) => s + (Number(r[col]) || 0), 0);
      const pct   = totalApplied > 0 ? Math.round((sales / totalApplied) * 100) : 0;
      // Short label: strip "Tide " prefix for readability on X-axis
      const product = col.replace(/^Tide\s*/i, "").trim() || col;
      return { product, col, sales, pct };
    }).filter((d) => d.sales > 0);
  }, [tideColumns, rows]);

  // ── Points Breakdown data — contribution per product to Total_Points ────
  // Uses exact same formula as feature_engineering.py points_formula
  const POINTS_FORMULA = [
    { col: "Tide OB with PP",       weight: 2,   label: "Tide OB with PP",       color: "#7c3aed" },
    { col: "Tide Insurance",         weight: 1,   label: "Tide Insurance",         color: "#f59e0b" },
    { col: "Tide MSME",              weight: 0.3, label: "Tide MSME (×0.3)",       color: "#3b82f6" },
    { col: "Vehicle Points Earned",  weight: 1,   label: "Vehicle Points Earned",  color: "#10b981" },
    { col: "Aditya Birla",           weight: 1,   label: "Aditya Birla",           color: "#ec4899" },
    { col: "Airtel Payments Bank",   weight: 1,   label: "Airtel Payments Bank",   color: "#0ea5e9" },
    { col: "Tide",                   weight: 1,   label: "Tide (base)",            color: "#14b8a6" },
    { col: "Hero FinCorp",           weight: 1,   label: "Hero FinCorp",           color: "#f97316" },
  ];

  const pointsBreakdownData = useMemo(() => {
    return POINTS_FORMULA
      .map(({ col, weight, label, color }) => {
        const units  = rows.reduce((s, r) => s + (Number(r[col]) || 0), 0);
        const points = Math.round(units * weight * 10) / 10;
        const pct    = 0; // filled below
        return { label, col, weight, units, points, color };
      })
      .filter((d) => d.units > 0)
      .sort((a, b) => b.points - a.points)
      .map((d, _, arr) => {
        const total = arr.reduce((s, x) => s + x.points, 0);
        return { ...d, pct: total > 0 ? Math.round((d.points / total) * 100) : 0 };
      });
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const conversionByMonthData = useMemo(() => {
    const map = {};
    (Array.isArray(raw) ? raw : []).forEach((r) => {
      const month = r["_month"] || "Unknown";
      // Use the correct onboard column for each month
      const monthOnboardCol =
        (onboardColMap.byMonth && onboardColMap.byMonth[month]) ||
        FRONTEND_ONBOARD_FALLBACK[month] ||
        onboardColMap.default ||
        "Tide OB with PP";
      if (!map[month]) map[month] = { month, applied: 0, obWithPP: 0, onboardCol: monthOnboardCol };
      map[month].applied  += Number(r["Tide (All applied cases)"]) || 0;
      map[month].obWithPP += Number(r[monthOnboardCol]) || 0;
    });
    return Object.values(map)
      .filter((d) => d.applied > 0)
      .map((d) => ({
        ...d,
        rate: Math.round((d.obWithPP / d.applied) * 100),
        pending: d.applied - d.obWithPP,
      }))
      .sort((a, b) => {
        const parse = (s) => {
          const [mon, yr] = (s || "").split(" ");
          return parseInt(yr || 0) * 100 + (new Date(`${mon} 1`).getMonth() + 1 || 0);
        };
        return parse(a.month) - parse(b.month);
      });
  }, [raw, onboardColMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const tooltipStyle = { backgroundColor: ct.tooltipBg, color: ct.text, border: "none" };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "background.default", minHeight: "100vh" }}>
      <Typography variant="h4" sx={{ mb: 1 }}>Tide Product Analytics</Typography>
      {/* <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Click any bar or slice to see the employee drill-down table. Click a number in the table to edit and sync to Google Sheet.
      </Typography> */}

      {/* ── TOP SECTION: MongoDB-driven filters + KPIs ─────────────────── */}
      {/* Date quick filters */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'today', 'week', 'month'].map(f => (
          <Button key={f} size="small"
            variant={topDateFilter === f ? 'contained' : 'outlined'}
            onClick={() => { setTopDateFilter(f); setTopFromDate(''); setTopToDate(''); }}
            sx={{ fontWeight: 700, textTransform: 'capitalize',
              bgcolor: topDateFilter === f ? BRAND.primary : 'transparent',
              borderColor: BRAND.primary, color: topDateFilter === f ? '#fff' : BRAND.primary }}>
            {f === 'all' ? 'All' : f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
          </Button>
        ))}
        <TextField size="small" type="date" label="From" value={topFromDate}
          onChange={e => { setTopFromDate(e.target.value); setTopDateFilter('custom'); }}
          InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
        <TextField size="small" type="date" label="To" value={topToDate}
          onChange={e => { setTopToDate(e.target.value); setTopDateFilter('custom'); }}
          InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
        {(topDateFilter !== 'all' || topFromDate || topToDate) && (
          <Button size="small" variant="outlined" color="error" fontWeight={700}
            onClick={() => { setTopDateFilter('all'); setTopFromDate(''); setTopToDate(''); }}>
            Reset
          </Button>
        )}
      </Box>

      {/* Dropdown filters */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <Autocomplete size="small" options={topMonthOptions} value={topFilterMonth || null}
          onChange={(_, v) => setTopFilterMonth(v || '')}
          renderInput={(params) => <TextField {...params} label="Month" />}
          sx={{ minWidth: 150 }} freeSolo={false} />
        <Autocomplete size="small" options={topTlOptions} value={topFilterTL || null}
          onChange={(_, v) => { setTopFilterTL(v || ''); setTopFilterFSE(''); }}
          renderInput={(params) => <TextField {...params} label="Team Leader" />}
          sx={{ minWidth: 180 }} freeSolo={false} />
        <Autocomplete size="small" options={topFseOptions} value={topFilterFSE || null}
          onChange={(_, v) => {
            setTopFilterFSE(v || '');
            if (v) {
              const emp = mongoEmployees.find(e => e.newJoinerName === v);
              if (emp?.reportingManager) setTopFilterTL(emp.reportingManager);
            }
          }}
          renderInput={(params) => <TextField {...params} label="Employee" />}
          sx={{ minWidth: 180 }} freeSolo={false} />
        <Autocomplete size="small" options={topStatusOptions} value={topFilterStatus || null}
          onChange={(_, v) => setTopFilterStatus(v || '')}
          renderInput={(params) => <TextField {...params} label="Status" />}
          sx={{ minWidth: 220 }} freeSolo={false} />
        <Button variant="outlined" size="small" onClick={() => {
          setTopFilterTL(''); setTopFilterFSE(''); setTopFilterStatus(''); setTopFilterMonth('');
          setTopDateFilter('all'); setTopFromDate(''); setTopToDate('');
        }} sx={{ fontWeight: 700 }}>Reset</Button>
      </Box>

      {/* Dynamic Product KPIs from MongoDB */}
      {productKpis.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary"
            sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, mb: 1.5 }}>
            Forms by Product
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 2, mb: 1 }}>
            {productKpis.map(k => (
              <Card key={k.product} variant="outlined"
                sx={{
                  transition: 'all 0.2s', cursor: 'default',
                  '&:hover': { borderColor: k.color, transform: 'translateY(-2px)', boxShadow: `0 4px 20px ${k.color}33` },
                }}>
                <Box sx={{ height: 4, bgcolor: k.color, borderRadius: '3px 3px 0 0' }} />
                <CardContent sx={{ textAlign: 'center', py: 1.5, px: 1.5 }}>
                  <Typography variant="body2" color="text.secondary"
                    sx={{ fontSize: 10, mb: 0.5, lineHeight: 1.3, minHeight: 28 }}>
                    {k.product}
                  </Typography>
                  <Typography variant="h5" sx={{ color: k.color, fontWeight: 800, fontSize: '1.6rem' }}>
                    {k.count}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.4, fontSize: 9 }}>forms submitted</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* Visit Status KPIs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: showOnboardVerify ? 1 : 3 }}>
        {[
          { label: 'Ready for Onboarding',          value: visitStatusCounts.onboarding, color: '#2e7d32', bg: '#e6f4ea', clickable: true },
          { label: 'Not Interested',                value: visitStatusCounts.notInt,     color: '#c62828', bg: '#fdecea' },
          { label: 'Try but not done due to error', value: visitStatusCounts.tryErr,     color: '#e65100', bg: '#fff3e0' },
          { label: 'Need to visit again',           value: visitStatusCounts.revisit,    color: '#1565c0', bg: '#e3f2fd' },
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
              const onboardForms = topFilteredForms.filter(f => f.status === 'Ready for Onboarding');
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

      {/* Onboarding Verification Sub-KPIs */}
      {showOnboardVerify && (
        <OnboardVerifySection
          filteredForms={topFilteredForms}
          onboardVerifyMap={onboardVerifyMap}
          onboardVerifying={onboardVerifying}
          verifyDrillStatus={verifyDrillStatus}
          setVerifyDrillStatus={setVerifyDrillStatus}
          employees={mongoEmployees}
        />
      )}

      {/* ── CHARTS SECTION: Google Sheets data ──────────── */}

      {/* Custom Chart */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ pb: "16px !important" }}>

          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Custom Column Chart</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11, mt: 0.3 }}>
                Pick any product columns below — chart updates instantly for the selected month
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexShrink: 0, ml: 2 }}>
              <Button
                size="small" variant="outlined"
                onClick={() => setSelectedCols(allProductCols.filter((c) => mongoAggregatedData.byEmployee.some((r) => (r[c] || 0) > 0)))}
                sx={{ fontSize: 11, textTransform: "none", borderRadius: 2 }}
              >
                Select All
              </Button>
              <Button
                size="small" variant="outlined" color="error"
                onClick={() => setSelectedCols([])}
                sx={{ fontSize: 11, textTransform: "none", borderRadius: 2 }}
              >
                Clear
              </Button>
              <IconButton size="small" onClick={() => setSelectorOpen((p) => !p)} sx={{ ml: 0.5 }}>
                {selectorOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </Box>
          </Box>

          {/* Pill selector panel */}
          <Collapse in={selectorOpen}>
            <Box sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              p: 2,
              bgcolor: muiTheme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
            }}>
              {Object.entries(mongoProductMeta.product_groups).map(([group, meta], gi) => {
                const GROUP_COLORS = ["#7c3aed","#10b981","#3b82f6","#f59e0b","#ec4899","#14b8a6","#ef4444","#0ea5e9"];
                const groupColor = GROUP_COLORS[gi % GROUP_COLORS.length];
                const cols = meta.columns || [];
                if (cols.length === 0) return null;
                return (
                  <Box key={group} sx={{ mb: gi < Object.keys(mongoProductMeta.product_groups).length - 1 ? 2 : 0 }}>
                    {/* Group label with colored left border */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Box sx={{ width: 3, height: 16, borderRadius: 1, bgcolor: groupColor, flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: groupColor, textTransform: "uppercase", letterSpacing: 1.2, fontSize: 10 }}>
                        {group}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.4, fontSize: 10 }}>
                        ({cols.filter((c) => mongoAggregatedData.byEmployee.some((r) => (r[c] || 0) > 0)).length}/{cols.length} active)
                      </Typography>
                    </Box>
                    {/* Pill chips */}
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                      {cols.map((col) => {
                        const hasData = mongoAggregatedData.byEmployee.some((r) => (r[col] || 0) > 0);
                        const isSelected = selectedCols.includes(col);
                        const total = mongoAggregatedData.byEmployee.reduce((s, r) => s + (r[col] || 0), 0);
                        return (
                          <Chip
                            key={col}
                            label={
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                                <span style={{ fontSize: 11 }}>{col}</span>
                                {hasData && (
                                  <Box component="span" sx={{
                                    fontSize: 10, fontWeight: 700,
                                    bgcolor: isSelected ? "rgba(255,255,255,0.25)" : (muiTheme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"),
                                    borderRadius: 1, px: 0.6, py: 0.1, lineHeight: 1.6,
                                  }}>
                                    {total}
                                  </Box>
                                )}
                              </Box>
                            }
                            onClick={hasData ? () => toggleCol(col) : undefined}
                            size="small"
                            variant={isSelected ? "filled" : "outlined"}
                            sx={{
                              cursor: hasData ? "pointer" : "default",
                              opacity: hasData ? 1 : 0.3,
                              borderColor: isSelected ? groupColor : "divider",
                              bgcolor: isSelected ? groupColor : "transparent",
                              color: isSelected ? "#fff" : "text.primary",
                              fontWeight: isSelected ? 600 : 400,
                              transition: "all 0.15s ease",
                              "&:hover": hasData ? {
                                bgcolor: isSelected ? groupColor : `${groupColor}22`,
                                borderColor: groupColor,
                              } : {},
                              "& .MuiChip-label": { px: 1 },
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Collapse>

          {/* Selected summary + chart */}
          {selectedCols.length > 0 && (
            <Box sx={{ mt: 2 }}>
              {/* Group-by toggle */}
              <Box sx={{
                display: "flex", alignItems: "center", gap: 1.5, mb: 2,
                p: 1.5, borderRadius: 2,
                bgcolor: muiTheme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                border: "1px solid", borderColor: "divider",
              }}>
                <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.6, textTransform: "uppercase", letterSpacing: 1, fontSize: 10, flexShrink: 0 }}>
                  Group by:
                </Typography>
                {[
                  { value: "employee", label: "Employee" },
                  { value: "tl",       label: "Team Leader" },
                ].map(({ value, label }) => (
                  <Box
                    key={value}
                    onClick={() => setGroupBy(value)}
                    sx={{
                      px: 2, py: 0.6, borderRadius: 5, cursor: "pointer", fontSize: 12, fontWeight: 600,
                      transition: "all 0.18s ease",
                      bgcolor: groupBy === value ? "primary.main" : "transparent",
                      color: groupBy === value ? "#fff" : "text.secondary",
                      border: "1.5px solid",
                      borderColor: groupBy === value ? "primary.main" : "divider",
                      "&:hover": { borderColor: "primary.main", color: groupBy === value ? "#fff" : "primary.main" },
                    }}
                  >
                    {label}
                  </Box>
                ))}
                <Typography variant="caption" sx={{ ml: "auto", opacity: 0.45, fontSize: 10 }}>
                  {customChartData.length} {groupBy === "tl" ? "team leaders" : "employees"} · {selectedCols.length} column{selectedCols.length > 1 ? "s" : ""}
                </Typography>
              </Box>

              {/* Selected chips summary */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
                {selectedCols.map((col, i) => (
                  <Chip
                    key={col}
                    label={col}
                    size="small"
                    onDelete={() => toggleCol(col)}
                    sx={{ fontSize: 10, bgcolor: COLORS[i % COLORS.length], color: "#fff", "& .MuiChip-deleteIcon": { color: "rgba(255,255,255,0.7)" } }}
                  />
                ))}
              </Box>

              {customChartData.length > 0 ? (
                <>
                  {/* Zoom + action controls */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1.5, justifyContent: "flex-end" }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mr: "auto", fontSize: 11 }}>
                      Drag the brush to pan · zoom buttons adjust height
                    </Typography>
                    <MuiTooltip title="Zoom out">
                      <span>
                        <IconButton size="small" onClick={() => setChartZoomed((h) => Math.max(240, h - 120))} disabled={chartZoomed <= 240}>
                          <ZoomOutIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </MuiTooltip>
                    <Typography variant="caption" sx={{ minWidth: 36, textAlign: "center", opacity: 0.5, fontSize: 11 }}>
                      {chartZoomed}px
                    </Typography>
                    <MuiTooltip title="Zoom in">
                      <span>
                        <IconButton size="small" onClick={() => setChartZoomed((h) => Math.min(900, h + 120))} disabled={chartZoomed >= 900}>
                          <ZoomInIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </MuiTooltip>
                    <MuiTooltip title={showCustomTable ? "Hide table" : "Show editable table"}>
                      <IconButton size="small" onClick={() => setShowCustomTable((p) => !p)}
                        sx={{ color: showCustomTable ? "primary.main" : "inherit" }}>
                        <TableChartIcon fontSize="small" />
                      </IconButton>
                    </MuiTooltip>
                    <MuiTooltip title="Fullscreen">
                      <IconButton size="small" onClick={() => setChartFullscreen(true)}>
                        <FullscreenIcon fontSize="small" />
                      </IconButton>
                    </MuiTooltip>
                  </Box>

                  <ResponsiveContainer width="100%" height={chartZoomed}>
                    <BarChart
                      data={customChartData}
                      barCategoryGap="28%" barGap={4}
                      margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
                      onClick={(e) => {
                        if (!e?.activePayload) return;
                        const d = e.activePayload[0]?.payload;
                        if (groupBy === "tl") {
                          const tlData = mongoAggregatedData.byTL.filter(r => r.name === d.key);
                          openMongoDrill(`TL: ${d.key} — Custom Selection`, tlData, selectedCols);
                        } else {
                          const empData = mongoAggregatedData.byEmployee.filter(r => r.name === d.key);
                          openMongoDrill(`Employee: ${d.key} — Custom Selection`, empData, selectedCols);
                        }
                      }}
                    >
                      <CartesianGrid stroke={ct.grid} strokeDasharray="4 4" vertical={false} />
                      <XAxis
                        dataKey="key"
                        stroke={ct.text}
                        tick={{ fontSize: 11, fill: ct.text }}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={60}
                        tickLine={false}
                        axisLine={{ stroke: ct.grid }}
                      />
                      <YAxis
                        stroke={ct.text}
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: ct.text }}
                        tickLine={false}
                        axisLine={false}
                        width={36}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: ct.tooltipBg, color: ct.text, border: "none", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
                        cursor={{ fill: muiTheme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}
                        formatter={(val, colName, props) =>
                          groupBy === "employee"
                            ? [val, `${colName} (TL: ${props.payload.tl})`]
                            : [val, colName]
                        }
                      />
                      <Legend
                        verticalAlign="top"
                        wrapperStyle={{ paddingBottom: 8, fontSize: 12 }}
                      />
                      {selectedCols.map((col, i) => (
                        <Bar
                          key={col}
                          dataKey={col}
                          name={col}
                          fill={COLORS[i % COLORS.length]}
                          radius={[5, 5, 0, 0]}
                          style={{ cursor: "pointer" }}
                          label={{ position: "top", fontSize: 10, fill: ct.text, formatter: (v) => v > 0 ? v : "" }}
                        />
                      ))}
                      <Brush
                        dataKey="key"
                        height={20}
                        stroke={ct.grid}
                        fill={muiTheme.palette.background.paper}
                        travellerWidth={8}
                        startIndex={0}
                        endIndex={Math.min(customChartData.length - 1, 11)}
                      />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Inline editable table — shown when table icon is toggled */}
                  <Collapse in={showCustomTable}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                      Editable Table — {selectedCols.length} column{selectedCols.length > 1 ? "s" : ""} · {mongoAggregatedData.byEmployee.filter((r) => selectedCols.some((c) => (r[c] || 0) > 0)).length} employees
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: 11 }}>
                      Note: This table shows MongoDB form counts. Editing is not available for MongoDB data.
                    </Typography>
                    {/* Display-only table for MongoDB data */}
                    <Box sx={{ overflowX: "auto", maxHeight: 420, overflowY: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>#</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>TL</TableCell>
                            {selectedCols.map((c) => (
                              <TableCell key={c} sx={{ fontWeight: 700, fontSize: 11, whiteSpace: "nowrap", bgcolor: "action.hover" }}>
                                {c}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {mongoAggregatedData.byEmployee
                            .filter((r) => selectedCols.some((c) => (r[c] || 0) > 0))
                            .sort((a, b) => {
                              const sumA = selectedCols.reduce((s, c) => s + (a[c] || 0), 0);
                              const sumB = selectedCols.reduce((s, c) => s + (b[c] || 0), 0);
                              return sumB - sumA;
                            })
                            .map((row, i) => (
                              <TableRow key={i} hover>
                                <TableCell sx={{ fontSize: 11, color: "text.secondary" }}>{i + 1}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{row.name}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{row.tl}</TableCell>
                                {selectedCols.map((col) => (
                                  <TableCell key={col} sx={{ whiteSpace: "nowrap", fontSize: 12 }}>
                                    <strong>{row[col] || 0}</strong>
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </Box>
                  </Collapse>
                </>
              ) : (
                <Box sx={{ textAlign: "center", py: 4, opacity: 0.5 }}>
                  <Typography variant="body2">No data for selected columns in this month.</Typography>
                </Box>
              )}
            </Box>
          )}

          {selectedCols.length === 0 && !selectorOpen && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, textAlign: "center", opacity: 0.6 }}>
              Expand the panel and select columns to generate a chart.
            </Typography>
          )}
          {selectedCols.length === 0 && selectorOpen && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, textAlign: "center", opacity: 0.6 }}>
              Click any pill above to add it to the chart.
            </Typography>
          )}

        </CardContent>
      </Card>

      {/* Fullscreen chart dialog */}
      <Dialog open={chartFullscreen} onClose={() => setChartFullscreen(false)} maxWidth="xl" fullWidth
        PaperProps={{ sx: { height: "90vh", display: "flex", flexDirection: "column" } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Box>
            <Typography variant="h6">Custom Column Chart — Fullscreen</Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedCols.length} column{selectedCols.length > 1 ? "s" : ""} · drag the brush to pan
            </Typography>
          </Box>
          <IconButton onClick={() => setChartFullscreen(false)}><FullscreenExitIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ flex: 1, display: "flex", flexDirection: "column", pt: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={customChartData}
              barCategoryGap="22%" barGap={3}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              onClick={(e) => {
                if (!e?.activePayload) return;
                const d = e.activePayload[0]?.payload;
                setChartFullscreen(false);
                if (groupBy === "tl") {
                  const tlData = mongoAggregatedData.byTL.filter(r => r.name === d.key);
                  openMongoDrill(`TL: ${d.key} — Custom Selection`, tlData, selectedCols);
                } else {
                  const empData = mongoAggregatedData.byEmployee.filter(r => r.name === d.key);
                  openMongoDrill(`Employee: ${d.key} — Custom Selection`, empData, selectedCols);
                }
              }}
            >
              <CartesianGrid stroke={ct.grid} strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="key" stroke={ct.text} tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis stroke={ct.text} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: ct.tooltipBg, color: ct.text, border: "none", borderRadius: 8 }}
                formatter={(val, colName, props) =>
                  groupBy === "employee"
                    ? [val, `${colName} (TL: ${props.payload.tl})`]
                    : [val, colName]
                }
              />
              <Legend verticalAlign="top" />
              {selectedCols.map((col, i) => (
                <Bar key={col} dataKey={col} name={col} fill={COLORS[i % COLORS.length]} radius={[5, 5, 0, 0]} style={{ cursor: "pointer" }}
                  label={{ position: "top", fontSize: 11, fill: ct.text, formatter: (v) => v > 0 ? v : "" }}
                />
              ))}
              <Brush
                dataKey="key"
                height={24}
                stroke={ct.grid}
                fill={muiTheme.palette.background.paper}
                travellerWidth={10}
              />
            </BarChart>
          </ResponsiveContainer>
        </DialogContent>
      </Dialog>

      {/* ── Per-Product Daily Trend Charts ─────────────────────────────── */}
      {Object.keys(productDailyData).length > 0 && (
        <Box sx={{ mb: 4, mt: 3 }}>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5, color: BRAND.primary }}>
            Daily Onboarding Trends by Product
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Day-wise breakdown of Ready for Onboarding, Fully Verified and Partially Done — per product. Responds to all filters above.
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            {Object.entries(productDailyData).map(([product, chartData], pi) => {
              const PROD_COLORS = ["#7c3aed","#10b981","#3b82f6","#f59e0b","#14b8a6","#ec4899","#0ea5e9","#ef4444"];
              const prodColor = PROD_COLORS[pi % PROD_COLORS.length];
              const totalOnboarding = chartData.reduce((s, d) => s + d.onboarding, 0);
              const totalVerified   = chartData.reduce((s, d) => s + d.fullyVerified, 0);
              const totalPartial    = chartData.reduce((s, d) => s + d.partiallyDone, 0);

              return (
                <Card key={product} variant="outlined" sx={{
                  borderRadius: 3,
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: `0 4px 20px ${prodColor}22` }
                }}>
                  <Box sx={{ height: 4, bgcolor: prodColor, borderRadius: '3px 3px 0 0' }} />
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                      <Box>
                        <Typography variant="h6" fontWeight={800} sx={{ color: prodColor }}>{product}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {chartData.length} day{chartData.length !== 1 ? 's' : ''} of data
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <Box sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', borderRadius: 5, px: 1.2, py: 0.3, fontSize: 11, fontWeight: 700 }}>
                          🟢 {totalOnboarding} Onboarding
                        </Box>
                        <Box sx={{ bgcolor: '#e8f5e9', color: '#1b5e20', borderRadius: 5, px: 1.2, py: 0.3, fontSize: 11, fontWeight: 700 }}>
                          ✓ {totalVerified} Verified
                        </Box>
                        <Box sx={{ bgcolor: '#fff8e1', color: '#f57f17', borderRadius: 5, px: 1.2, py: 0.3, fontSize: 11, fontWeight: 700 }}>
                          ◑ {totalPartial} Partial
                        </Box>
                      </Box>
                    </Box>
                    <ResponsiveContainer width="100%" height={220}>
                      <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 40, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={ct.grid} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: ct.text }} angle={-30} textAnchor="end" height={55} stroke={ct.text} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: ct.text }} stroke={ct.text} width={28} />
                        <Tooltip contentStyle={{ backgroundColor: ct.tooltipBg, color: ct.text, border: 'none', borderRadius: 8 }} labelFormatter={(label) => `Date: ${label}`} />
                        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11, paddingBottom: 4 }} />
                        <Bar dataKey="onboarding" name="Ready for Onboarding" fill="#2e7d32" radius={[4, 4, 0, 0]} opacity={0.85} />
                        <Line type="monotone" dataKey="fullyVerified" name="Fully Verified" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                        <Line type="monotone" dataKey="partiallyDone" name="Partially Done" stroke="#f57f17" strokeWidth={2.5} strokeDasharray="5 3" dot={{ r: 4, fill: '#f57f17', strokeWidth: 2, stroke: '#fff' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Box>
      )}

      <TideDrillTable
        open={drill.open}
        onClose={closeDrill}
        title={drill.title}
        rows={drill.rows}
        editableCols={drill.editableCols}
        dynamicCols={tideColumns}
      />

      {/* MongoDB Custom Chart Drill-down Dialog */}
      {mongoDrill && (
        <Dialog open={!!mongoDrill} onClose={closeMongoDrill} maxWidth="md" fullWidth
          PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
          <Box sx={{ background: "linear-gradient(135deg,#7c3aedcc,#7c3aed66)", px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700 }}>{mongoDrill.title}</Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
                {mongoDrill.data.length} {mongoDrill.data.length === 1 ? "record" : "records"}
              </Typography>
            </Box>
            <IconButton size="small" onClick={closeMongoDrill} sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.15)" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <DialogContent sx={{ p: 0 }}>
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: "#7c3aed", color: "#fff", width: 40 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: "#7c3aed", color: "#fff" }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: "#7c3aed", color: "#fff" }}>TL</TableCell>
                    {mongoDrill.cols.map(c => (
                      <TableCell key={c} sx={{ fontWeight: 700, bgcolor: "#7c3aed", color: "#fff", whiteSpace: "nowrap" }}>{c}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mongoDrill.data.map((row, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ color: "text.secondary", fontWeight: 600 }}>{i + 1}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{row.name}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{row.tl || "—"}</TableCell>
                      {mongoDrill.cols.map(c => (
                        <TableCell key={c} sx={{ fontSize: 12, fontWeight: 700 }}>{row[c] || 0}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>{mongoDrill.data.length} records</Typography>
            <Button onClick={closeMongoDrill} variant="contained" sx={{ bgcolor: "#7c3aed", fontWeight: 700 }}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
