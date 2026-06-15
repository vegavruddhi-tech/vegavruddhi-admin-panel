import React, { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import ProductDashboard from "./pages/ProductDashboard";
import Login from "./pages/Login";
import VerificationRules from "./pages/VerificationRules";
import EmployeeApprovals from "./pages/EmployeeApprovals";
import MerchantForms from "./pages/MerchantForms";
import TLOverview from './pages/TLOverview';
import ManagerOverview from './pages/ManagerOverview';
import AttendanceManagement from './pages/AttendanceManagement';
import SalarySlips from './pages/SalarySlips';
import PointsConfiguration from './pages/PointsConfiguration';
import FormBuilder from './pages/FormBuilder';
import { subscribeUserToPush } from './pushSubscriptionHelper';

import { ThemeProvider, createTheme, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import CssBaseline from "@mui/material/CssBaseline";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import Badge from "@mui/material/Badge";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Collapse from "@mui/material/Collapse";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import ExpandMoreIcon     from '@mui/icons-material/ExpandMore';
import ExpandLessIcon     from '@mui/icons-material/ExpandLess';

// Dropdown Icons
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import RuleIcon from "@mui/icons-material/Rule";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import ConstructionIcon from "@mui/icons-material/Construction";

import { BRAND } from "./theme";
import "./App.css";

const MAIN_NAV_ITEMS = [
  { value: "overview",      label: "Overview" },
  { value: "products",      label: "Products" },
  { value: "merchants",     label: "Merchant Forms" },
  { value: "tl",            label: "TL Overview" },
  { value: "manager",       label: "Manager View" },
];

// ── Responsive Navbar inner component (needs theme/breakpoints) ──
function NavbarContent({ page, setPage, pendingCount, mode, setMode, user, handleLogout }) {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const DROPDOWN_NAV_ITEMS = [
    { value: "attendance",    label: "Attendance",           icon: <AssignmentIndIcon fontSize="small" /> },
    { value: "verification",  label: "Verification Rules",   icon: <RuleIcon fontSize="small" /> },
    { value: "approvals",     label: "Approvals",            icon: <HowToRegIcon fontSize="small" /> },
    { value: "salary",        label: "Salary Slips",         icon: <ReceiptLongIcon fontSize="small" /> },
    { value: "points-config", label: "Points Configuration", icon: <SettingsSuggestIcon fontSize="small" /> },
    { value: "form-builder",  label: "Form Builder",         icon: <ConstructionIcon fontSize="small" /> },
  ];

  const isDropdownActive = DROPDOWN_NAV_ITEMS.some(item => item.value === page);
  const [mobileCollapse, setMobileCollapse] = useState(isDropdownActive);

  // Sync mobile collapse with active dropdown page
  useEffect(() => {
    if (isDropdownActive) {
      setMobileCollapse(true);
    }
  }, [page, isDropdownActive]);

  const handleNav = (val) => {
    setPage(val);
    localStorage.setItem("vv_page", val);
    setDrawerOpen(false);
  };

  const handleOpenDropdown = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseDropdown = () => {
    setAnchorEl(null);
  };

  const handleDropdownItemClick = (val) => {
    handleNav(val);
    handleCloseDropdown();
  };

  return (
    <>
      {/* ── NAVBAR BAR ─────────────────────────────────────────── */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1100,
          background: "linear-gradient(90deg, #071a0f 0%, #0f3320 40%, #1a5c38 100%)",
          borderBottom: `2.5px solid ${BRAND.accent}`,
          px: { xs: 2, md: 4 },
          py: 0,
          height: 62,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 20px rgba(0,0,0,0.55)",
        }}
      >
        {/* LEFT — Logo + Brand */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
          <Box
            component="img"
            src="/logo-full.png"
            alt="Vegavruddhi"
            sx={{
              height: 44,
              width: 44,
              objectFit: "contain",
              filter: "brightness(0) invert(1)",
              animation: "pulse 3.5s ease-in-out infinite",
            }}
          />
          <Box sx={{ lineHeight: 1 }}>
            <Typography
              sx={{
                fontFamily: "'Georgia', serif",
                fontWeight: 700,
                fontSize: { xs: "0.85rem", md: "1.1rem" },
                color: "#ffffff",
                letterSpacing: 1.8,
                textTransform: "uppercase",
                lineHeight: 1.15,
              }}
            >
              Vegavruddhi
            </Typography>
            <Typography
              sx={{
                fontSize: "0.58rem",
                color: BRAND.accent,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Admin Panel
            </Typography>
          </Box>
        </Box>

        {/* RIGHT */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>

          {/* Desktop Tabs */}
          {!isMobile && (
            <>
              <Tabs
                value={MAIN_NAV_ITEMS.some(item => item.value === page) ? page : (isDropdownActive ? "management" : false)}
                onChange={(_, v) => {
                  if (v !== "management") {
                    handleNav(v);
                  }
                }}
                textColor="inherit"
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTabs-flexContainer': {
                    alignItems: 'center'
                  }
                }}
              >
                {MAIN_NAV_ITEMS.map(item => (
                  <Tab key={item.value} value={item.value} label={item.label} />
                ))}
                
                {/* Custom trigger tab for the dropdown */}
                <Tab
                  value="management"
                  onClick={handleOpenDropdown}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Badge badgeContent={page === "approvals" ? 0 : pendingCount} color="error" variant="dot" invisible={pendingCount === 0}>
                        Management
                      </Badge>
                      <ExpandMoreIcon fontSize="small" sx={{ 
                        transform: Boolean(anchorEl) ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                        ml: 0.5
                      }} />
                    </Box>
                  }
                />
              </Tabs>

              {/* Beautiful Dropdown Menu */}
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseDropdown}
                disableScrollLock
                PaperProps={{
                  sx: {
                    mt: 1.5,
                    bgcolor: theme.palette.mode === 'dark' ? '#1c2a3a' : '#ffffff',
                    border: '1.5px solid rgba(26, 92, 56, 0.15)',
                    boxShadow: '0 4px 25px rgba(0,0,0,0.18)',
                    borderRadius: 2,
                    minWidth: 220,
                    '& .MuiMenuItem-root': {
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      py: 1.2,
                      px: 2.5,
                      gap: 1.5,
                      color: theme.palette.mode === 'dark' ? '#f1f5f9' : '#1a2e22',
                      '&:hover': {
                        bgcolor: 'rgba(26, 92, 56, 0.08)',
                        color: BRAND.primary
                      },
                      '&.Mui-selected': {
                        bgcolor: 'rgba(26, 92, 56, 0.12)',
                        color: BRAND.primary,
                        fontWeight: 700
                      }
                    }
                  }
                }}
              >
                {DROPDOWN_NAV_ITEMS.map(item => (
                  <MenuItem
                    key={item.value}
                    selected={page === item.value}
                    onClick={() => handleDropdownItemClick(item.value)}
                  >
                    {item.icon}
                    {item.value === "approvals" && pendingCount > 0 ? (
                      <Badge badgeContent={pendingCount} color="error" max={99} sx={{ '& .MuiBadge-badge': { right: -12, top: 4 } }}>
                        {item.label}
                      </Badge>
                    ) : item.label}
                  </MenuItem>
                ))}
              </Menu>

              <Box sx={{ width: "1px", height: 28, bgcolor: "rgba(255,255,255,0.15)", mx: 1 }} />
            </>
          )}

          {/* Theme toggle */}
          <Tooltip title={mode === "dark" ? "Light Mode" : "Dark Mode"}>
            <IconButton
              onClick={() => setMode((p) => (p === "light" ? "dark" : "light"))}
              sx={{
                color: "#fff",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                width: 36, height: 36,
                "&:hover": { background: "rgba(255,255,255,0.18)", transform: "rotate(22deg) scale(1.1)" },
                transition: "all 0.25s ease",
              }}
              size="small"
            >
              {mode === "light" ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* Desktop: username + logout */}
          {!isMobile && (
            <>
              <Box sx={{ width: "1px", height: 28, bgcolor: "rgba(255,255,255,0.15)", mx: 1 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {user?.picture && (
                  <Box component="img" src={user.picture} alt="avatar"
                    onError={e => { e.target.style.display = 'none'; }}
                    sx={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)' }} />
                )}
                <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", mr: 1 }}>
                  {user?.username || user?.email}
                </Typography>
              </Box>
              <Tooltip title="Logout">
                <IconButton onClick={handleLogout}
                  sx={{
                    color: "#fff", background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.18)", width: 36, height: 36,
                    "&:hover": { background: "rgba(239,68,68,0.3)", borderColor: "#ef4444" },
                    transition: "all 0.25s ease",
                  }}
                  size="small"
                >
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}

          {/* Mobile: hamburger */}
          {isMobile && (
            <>
              {pendingCount > 0 && (
                <Badge badgeContent={pendingCount} color="error" max={99}>
                  <Box />
                </Badge>
              )}
              <IconButton
                onClick={() => setDrawerOpen(true)}
                sx={{
                  color: "#fff", background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.18)", width: 36, height: 36,
                }}
                size="small"
              >
                <MenuIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>
      </Box>

      {/* ── MOBILE DRAWER ──────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 260,
            background: "linear-gradient(180deg, #071a0f 0%, #0f3320 100%)",
            color: "#fff",
          }
        }}
      >
        {/* Drawer header */}
        <Box sx={{ px: 2.5, py: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box component="img" src="/logo-full.png" alt="logo"
            sx={{ height: 36, width: 36, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff", letterSpacing: 1.5, textTransform: "uppercase" }}>
              Vegavruddhi
            </Typography>
            <Typography sx={{ fontSize: "0.55rem", color: BRAND.accent, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>
              Admin Panel
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />

        {/* User info */}
        <Box sx={{ px: 2.5, py: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
          {user?.picture && (
            <Box component="img" src={user.picture} alt="avatar"
              onError={e => { e.target.style.display = 'none'; }}
              sx={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)" }} />
          )}
          <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.78rem", wordBreak: "break-all" }}>
            {user?.username || user?.email}
          </Typography>
        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />

        {/* Nav items */}
        <List sx={{ pt: 1 }}>
          {MAIN_NAV_ITEMS.map(item => (
            <ListItem key={item.value} disablePadding>
              <ListItemButton
                selected={page === item.value}
                onClick={() => handleNav(item.value)}
                sx={{
                  px: 2.5, py: 1.2,
                  borderRadius: 2, mx: 1, mb: 0.5,
                  "&.Mui-selected": {
                    bgcolor: `${BRAND.accent}22`,
                    borderLeft: `3px solid ${BRAND.accent}`,
                  },
                  "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
                }}
              >
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: "0.88rem",
                    fontWeight: page === item.value ? 700 : 500,
                    color: page === item.value ? "#fff" : "rgba(255,255,255,0.7)",
                    letterSpacing: 0.5,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}

          {/* Collapsible Mobile Management Header */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => setMobileCollapse(!mobileCollapse)}
              sx={{
                px: 2.5, py: 1.2,
                borderRadius: 2, mx: 1, mb: 0.5,
                bgcolor: isDropdownActive ? "rgba(255,255,255,0.04)" : "transparent",
                "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Badge badgeContent={page === "approvals" ? 0 : pendingCount} color="error" variant="dot" invisible={pendingCount === 0}>
                      Management
                    </Badge>
                  </Box>
                }
                primaryTypographyProps={{
                  fontSize: "0.88rem",
                  fontWeight: isDropdownActive ? 700 : 500,
                  color: isDropdownActive ? "#fff" : "rgba(255,255,255,0.7)",
                  letterSpacing: 0.5,
                }}
              />
              {mobileCollapse ? <ExpandLessIcon fontSize="small" sx={{ color: "rgba(255,255,255,0.7)" }} /> : <ExpandMoreIcon fontSize="small" sx={{ color: "rgba(255,255,255,0.7)" }} />}
            </ListItemButton>
          </ListItem>

          <Collapse in={mobileCollapse} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 2 }}>
              {DROPDOWN_NAV_ITEMS.map(item => (
                <ListItem key={item.value} disablePadding>
                  <ListItemButton
                    selected={page === item.value}
                    onClick={() => handleNav(item.value)}
                    sx={{
                      px: 2.5, py: 1,
                      borderRadius: 2, mx: 1, mb: 0.5,
                      "&.Mui-selected": {
                        bgcolor: `${BRAND.accent}22`,
                        borderLeft: `3px solid ${BRAND.accent}`,
                      },
                      "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, color: page === item.value ? BRAND.accent : "rgba(255,255,255,0.5)" }}>
                      {item.icon}
                    </Box>
                    <ListItemText
                      primary={
                        item.value === "approvals" && pendingCount > 0 ? (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {item.label}
                            <Badge badgeContent={pendingCount} color="error" max={99} />
                          </Box>
                        ) : item.label
                      }
                      primaryTypographyProps={{
                        fontSize: "0.82rem",
                        fontWeight: page === item.value ? 700 : 500,
                        color: page === item.value ? "#fff" : "rgba(255,255,255,0.6)",
                        letterSpacing: 0.5,
                      }}
                      sx={{ pl: 1.5 }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
        </List>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.12)", mt: "auto" }} />

        {/* Drawer footer actions */}
        <Box sx={{ px: 2, py: 2, display: "flex", gap: 1 }}>
          <Button
            fullWidth
            startIcon={mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
            onClick={() => setMode(p => p === "light" ? "dark" : "light")}
            sx={{ color: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.2)", fontSize: "0.78rem", fontWeight: 600 }}
            variant="outlined"
            size="small"
          >
            {mode === "light" ? "Dark" : "Light"}
          </Button>
          <Button
            fullWidth
            startIcon={<LogoutIcon />}
            onClick={() => { handleLogout(); setDrawerOpen(false); }}
            sx={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.4)", fontSize: "0.78rem", fontWeight: 600 }}
            variant="outlined"
            size="small"
          >
            Logout
          </Button>
        </Box>
      </Drawer>
    </>
  );
}

// Initialize global cache object on window
if (typeof window !== "undefined") {
  window.vv_cache = window.vv_cache || {
    dashboardData: null,
    dashboardVerify: null,
    productData: null,
    productMongo: null,
    productVerify: null,
    tlData: null,
    tlVerify: null,
    merchantForms: null
  };
  window.clearVvCache = () => {
    if (window.vv_cache) {
      window.vv_cache.dashboardData = null;
      window.vv_cache.dashboardVerify = null;
      window.vv_cache.productData = null;
      window.vv_cache.productMongo = null;
      window.vv_cache.productVerify = null;
      window.vv_cache.tlData = null;
      window.vv_cache.tlVerify = null;
      window.vv_cache.merchantForms = null;
      console.log('🗑️ [Global Cache] All page caches cleared');
    }
  };
}

function App() {
  const [mode, setMode] = useState("light");
  const [page, setPage] = useState(() => localStorage.getItem("vv_page") || "overview");
  const [pendingCount, setPendingCount] = useState(0);
  const [splash, setSplash] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  // Track which pages have already loaded in this session (resets on full page refresh)
  const [pagesLoaded, setPagesLoaded] = useState({});

  // Wait for data, with min 1.5s for animation
  useEffect(() => {
    if (!dataReady) return;
    const timer = setTimeout(() => setSplash(false), 1500);
    return () => clearTimeout(timer);
  }, [dataReady]);

  // Fallback: hide splash after 15s max if API never responds
  useEffect(() => {
    const fallback = setTimeout(() => setSplash(false), 15000);
    return () => clearTimeout(fallback);
  }, []);

  const handleDataReady = () => {
    setDataReady(true);
  };

  const EMP_BASE = process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api';

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const [empRes, posRes, tlRes] = await Promise.all([
          fetch(`${EMP_BASE}/auth/pending`),
          fetch(`${EMP_BASE}/auth/position-requests`),
          fetch(`${EMP_BASE}/tl/pending`),
        ]);
        const empData = await empRes.json();
        const posData = await posRes.json();
        const tlData  = tlRes.ok ? await tlRes.json() : [];
        const empCount = Array.isArray(empData) ? empData.length : 0;
        const posCount = Array.isArray(posData) ? posData.filter(r => r.status === 'pending').length : 0;
        const tlCount  = Array.isArray(tlData)  ? tlData.length : 0;
        setPendingCount(empCount + posCount + tlCount);
      } catch { /* server might be off */ }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 10000);
    return () => clearInterval(interval);
  }, []);

  const savedAuth = localStorage.getItem("vv_auth");
  const [user, setUser] = useState(savedAuth ? JSON.parse(savedAuth) : null);

  const handleLogin  = (authObj) => {
    setUser(authObj);
    setSplash(true);
    setDataReady(false);
  };
  const handleLogout = () => {
    localStorage.removeItem("vv_auth");
    sessionStorage.removeItem("mf_loaded");
    sessionStorage.removeItem("tl_loaded");
    sessionStorage.removeItem("pd_loaded");
    sessionStorage.removeItem("ao_loaded");
    setPagesLoaded({});
    setUser(null);
  };

  // Subscribe to push notifications when user is logged in
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token') || localStorage.getItem('emp_token');
      if (token) {
        subscribeUserToPush(EMP_BASE, token);
      }
    }
  }, [user]);

  const theme = createTheme({
    palette: {
      mode,
      primary: { main: BRAND.primary, light: BRAND.primaryMid, dark: "#0d3d24" },
      secondary: { main: BRAND.accent },
      background: {
        default: mode === "dark" ? "#111827" : "#f0f7f3",
        paper:   mode === "dark" ? "#1c2a3a" : "#ffffff",
      },
      text: {
        primary:   mode === "dark" ? "#f1f5f9" : "#1a2e22",
        secondary: mode === "dark" ? "#94a3b8" : "#4a7060",
      },
    },
    typography: {
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      h6: { fontWeight: 700, letterSpacing: 0.4 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            transition: "box-shadow 0.25s, transform 0.2s",
            ...(mode === "dark" && {
              background: "#1e2d3d",
              border: "1px solid rgba(255,255,255,0.07)",
            }),
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            ...(mode === "dark" && { background: "#1e2d3d" }),
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            fontSize: "0.82rem",
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.65)",
            minWidth: 80,
            "&.Mui-selected": { color: "#ffffff" },
            transition: "color 0.2s",
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { backgroundColor: BRAND.accent, height: 3, borderRadius: 2 },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* ── SPLASH SCREEN ─────────────────────────────────────── */}
      <style>{`
        @keyframes splashLogoIn {
          0%   { opacity: 0; transform: scale(0.7); }
          60%  { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splashBar {
          0%   { width: 0%; margin-left: 0%; }
          50%  { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
      {splash && (
        <Box sx={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999,
          bgcolor: '#071a0f',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 3,
          overflow: 'hidden',
        }}>
          <Box sx={{ animation: 'splashLogoIn 0.8s ease forwards', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <Box component="img" src="/logo-full.png" alt="Vegavruddhi"
              sx={{ width: 80, height: 80, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            <Typography sx={{ color: '#fff', fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: '1.4rem', letterSpacing: 3, textTransform: 'uppercase' }}>
              Vegavruddhi
            </Typography>
            <Typography sx={{ color: BRAND.accent, fontSize: '0.65rem', letterSpacing: 4, textTransform: 'uppercase', fontWeight: 600 }}>
              Admin Panel
            </Typography>
          </Box>
          {/* Progress bar */}
          <Box sx={{ width: 180, height: 3, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', mt: 1 }}>
            <Box sx={{ height: '100%', bgcolor: BRAND.accent, borderRadius: 10, animation: 'splashBar 1.4s ease-in-out infinite' }} />
          </Box>
        </Box>
      )}

      {!user && <Login onLogin={handleLogin} />}

      {user && (
        <>
          <NavbarContent
            page={page}
            setPage={setPage}
            pendingCount={pendingCount}
            mode={mode}
            setMode={setMode}
            user={user}
            handleLogout={handleLogout}
          />

          {/* ── PAGE CONTENT ─────────────────────────────────────── */}
          <Box
            key={page}
            className="page-enter"
            sx={{
              minHeight: "calc(100vh - 62px)",
              bgcolor: "background.default",
              transition: "background-color 0.3s",
            }}
          >
            {page === "overview"       ? <Dashboard onReady={handleDataReady} /> :
             page === "products"       ? <ProductDashboard onLoaded={handleDataReady} /> :
             page === "merchants"      ? <MerchantForms onReady={handleDataReady} /> :
             page === "verification"   ? <VerificationRules token={user?.token} onReady={handleDataReady} /> :
             page === "approvals"      ? <EmployeeApprovals onReady={handleDataReady} /> :
             page === "tl"             ? <TLOverview onLoaded={handleDataReady} /> :
             page === "manager"        ? <ManagerOverview onReady={handleDataReady} /> :
             page === "attendance"     ? <AttendanceManagement onReady={handleDataReady} /> :
             page === "salary"         ? <SalarySlips onReady={handleDataReady} /> :
             page === "points-config"  ? <PointsConfiguration onReady={handleDataReady} /> :
             page === "form-builder"   ? <FormBuilder onReady={handleDataReady} /> : null}
          </Box>
        </>
      )}
    </ThemeProvider>
  );
}

export default App;
