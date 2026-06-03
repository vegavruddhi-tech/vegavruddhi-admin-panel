// File: vegavruddhi-admin-panel/fse-dashboard/src/components/JitsiMeeting.js

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Checkbox, List, ListItem, ListItemText,
  Chip, Box, Typography, Alert, Snackbar, IconButton,
  CircularProgress, Tooltip, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel,
  MenuItem, Select, InputLabel, Divider, Paper, Card, CardContent
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import LaunchIcon from '@mui/icons-material/Launch';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { BRAND } from '../theme';

export default function JitsiMeeting({ open, onClose, employees = [], tls = [] }) {
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchFSE, setSearchFSE] = useState('');
  const [searchTL, setSearchTL] = useState('');
  const [searchManager, setSearchManager] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [managers, setManagers] = useState([]);
  const [jitsiRoom, setJitsiRoom] = useState(null); // { roomName, meetingLink }
  const [showJitsi, setShowJitsi] = useState(false);
  
  // Scheduling states
  const [meetingType, setMeetingType] = useState('now'); // 'now' or 'scheduled'
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState('30'); // in minutes
  
  // Scheduled meetings list
  const [scheduledMeetings, setScheduledMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  
  // Attendance tracking
  const [liveAttendance, setLiveAttendance] = useState([]);
  const [jitsiApi, setJitsiApi] = useState(null);
  const [currentMeetingId, setCurrentMeetingId] = useState(null); // Track the active meeting ID
  const [meetingStartTime, setMeetingStartTime] = useState(null);
  const jitsiContainerRef = React.useRef(null);

  // Fetch managers list
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api'}/manager/approved-list`);
        const data = await response.json();
        setManagers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching managers:', err);
        setManagers([]);
      }
    };
    if (open) {
      fetchManagers();
      fetchScheduledMeetings();
    }
  }, [open]);

  // Fetch scheduled meetings
  const fetchScheduledMeetings = async () => {
    setLoadingMeetings(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api'}/meetings/jitsi/scheduled`);
      const data = await response.json();
      if (data.success) {
        setScheduledMeetings(data.meetings || []);
      }
    } catch (err) {
      console.error('Error fetching scheduled meetings:', err);
    }
    setLoadingMeetings(false);
  };

  // Combine employees, TLs, and Managers
  const allAttendees = useMemo(() => {
    const empList = employees.map(e => ({
      _id: e._id,
      name: e.newJoinerName || e.name,
      email: e.newJoinerEmailId || e.email,
      position: e.position || 'FSE',
      type: 'FSE',
      reportingManager: e.reportingManager
    }));
    
    const tlList = tls.map(t => ({
      _id: t._id,
      name: t.name,
      email: t.email,
      position: 'Team Lead',
      type: 'TL',
      reportingManager: t.reportingManager
    }));
    
    const managerList = managers.map(m => ({
      _id: m._id,
      name: m.name,
      email: m.email,
      position: 'Manager',
      type: 'Manager'
    }));
    
    return [...empList, ...tlList, ...managerList];
  }, [employees, tls, managers]);

  // Build hierarchy maps
  const hierarchyMap = useMemo(() => {
    const managerToTLs = {};
    const tlToFSEs = {};
    
    allAttendees.forEach(person => {
      if (person.type === 'TL' && person.reportingManager) {
        if (!managerToTLs[person.reportingManager]) {
          managerToTLs[person.reportingManager] = [];
        }
        managerToTLs[person.reportingManager].push(person._id);
      }
      
      if (person.type === 'FSE' && person.reportingManager) {
        if (!tlToFSEs[person.reportingManager]) {
          tlToFSEs[person.reportingManager] = [];
        }
        tlToFSEs[person.reportingManager].push(person._id);
      }
    });
    
    return { managerToTLs, tlToFSEs };
  }, [allAttendees]);

  // Get all subordinates for a manager
  const getManagerSubordinates = (managerName) => {
    const tlIds = hierarchyMap.managerToTLs[managerName] || [];
    const fseIds = [];
    
    tlIds.forEach(tlId => {
      const tl = allAttendees.find(a => a._id === tlId);
      if (tl) {
        const tlFSEs = hierarchyMap.tlToFSEs[tl.name] || [];
        fseIds.push(...tlFSEs);
      }
    });
    
    return [...tlIds, ...fseIds];
  };

  // Get all FSEs for a TL
  const getTLSubordinates = (tlName) => {
    return hierarchyMap.tlToFSEs[tlName] || [];
  };

  // Filtered lists
  const filteredFSEs = useMemo(() => {
    return allAttendees
      .filter(a => a.type === 'FSE')
      .filter(a => 
        a.name.toLowerCase().includes(searchFSE.toLowerCase()) ||
        a.email.toLowerCase().includes(searchFSE.toLowerCase())
      );
  }, [allAttendees, searchFSE]);

  const filteredTLs = useMemo(() => {
    return allAttendees
      .filter(a => a.type === 'TL')
      .filter(a => 
        a.name.toLowerCase().includes(searchTL.toLowerCase()) ||
        a.email.toLowerCase().includes(searchTL.toLowerCase())
      );
  }, [allAttendees, searchTL]);

  const filteredManagers = useMemo(() => {
    return allAttendees
      .filter(a => a.type === 'Manager')
      .filter(a => 
        a.name.toLowerCase().includes(searchManager.toLowerCase()) ||
        a.email.toLowerCase().includes(searchManager.toLowerCase())
      );
  }, [allAttendees, searchManager]);

  // Selection handlers
  const handlePersonSelect = (person, checked) => {
    if (checked) {
      let toAdd = [person._id];
      
      if (person.type === 'Manager') {
        const subordinates = getManagerSubordinates(person.name);
        toAdd = [...toAdd, ...subordinates];
      }
      
      if (person.type === 'TL') {
        const subordinates = getTLSubordinates(person.name);
        toAdd = [...toAdd, ...subordinates];
      }
      
      setSelectedAttendees([...new Set([...selectedAttendees, ...toAdd])]);
    } else {
      let toRemove = [person._id];
      
      if (person.type === 'Manager') {
        const subordinates = getManagerSubordinates(person.name);
        toRemove = [...toRemove, ...subordinates];
      }
      
      if (person.type === 'TL') {
        const subordinates = getTLSubordinates(person.name);
        toRemove = [...toRemove, ...subordinates];
      }
      
      setSelectedAttendees(selectedAttendees.filter(id => !toRemove.includes(id)));
    }
  };

  // Select all handlers
  const handleSelectAllFSE = (checked) => {
    if (checked) {
      const fseIds = filteredFSEs.map(a => a._id);
      setSelectedAttendees([...new Set([...selectedAttendees, ...fseIds])]);
    } else {
      const fseIds = filteredFSEs.map(a => a._id);
      setSelectedAttendees(selectedAttendees.filter(id => !fseIds.includes(id)));
    }
  };

  const handleSelectAllTL = (checked) => {
    if (checked) {
      const tlIds = filteredTLs.map(a => a._id);
      const fseIds = [];
      filteredTLs.forEach(tl => {
        const subordinates = getTLSubordinates(tl.name);
        fseIds.push(...subordinates);
      });
      setSelectedAttendees([...new Set([...selectedAttendees, ...tlIds, ...fseIds])]);
    } else {
      const tlIds = filteredTLs.map(a => a._id);
      const fseIds = [];
      filteredTLs.forEach(tl => {
        const subordinates = getTLSubordinates(tl.name);
        fseIds.push(...subordinates);
      });
      setSelectedAttendees(selectedAttendees.filter(id => ![...tlIds, ...fseIds].includes(id)));
    }
  };

  const handleSelectAllManager = (checked) => {
    if (checked) {
      const managerIds = filteredManagers.map(a => a._id);
      const subordinateIds = [];
      filteredManagers.forEach(manager => {
        const subordinates = getManagerSubordinates(manager.name);
        subordinateIds.push(...subordinates);
      });
      setSelectedAttendees([...new Set([...selectedAttendees, ...managerIds, ...subordinateIds])]);
    } else {
      const managerIds = filteredManagers.map(a => a._id);
      const subordinateIds = [];
      filteredManagers.forEach(manager => {
        const subordinates = getManagerSubordinates(manager.name);
        subordinateIds.push(...subordinates);
      });
      setSelectedAttendees(selectedAttendees.filter(id => ![...managerIds, ...subordinateIds].includes(id)));
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: 'Meeting link copied to clipboard!', severity: 'success' });
  };

  // Create Jitsi meeting and send emails
  const handleCreateMeeting = async () => {
    if (!meetingTitle.trim()) {
      setSnackbar({ open: true, message: 'Please enter a meeting title', severity: 'error' });
      return;
    }

    if (selectedAttendees.length === 0) {
      setSnackbar({ open: true, message: 'Please select at least one attendee', severity: 'error' });
      return;
    }

    // Validate scheduled meeting
    if (meetingType === 'scheduled') {
      if (!scheduledDate || !scheduledTime) {
        setSnackbar({ open: true, message: 'Please select date and time for scheduled meeting', severity: 'error' });
        return;
      }

      // Check if scheduled time is in the future
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduledDateTime <= new Date()) {
        setSnackbar({ open: true, message: 'Scheduled time must be in the future', severity: 'error' });
        return;
      }
    }

    setLoading(true);
    try {
      // Generate unique room name
      const roomName = `vegavruddhi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const meetingLink = `https://meet.jit.si/${roomName}`;

      // Get attendee details
      const attendees = selectedAttendees.map(id => {
        const attendee = allAttendees.find(a => a._id === id);
        return { email: attendee.email, name: attendee.name };
      });

      // Prepare request body
      const requestBody = {
        title: meetingTitle,
        meetingLink,
        roomName,
        attendees,
        isScheduled: meetingType === 'scheduled',
        scheduledDate: meetingType === 'scheduled' ? scheduledDate : null,
        scheduledTime: meetingType === 'scheduled' ? scheduledTime : null,
        duration: meetingType === 'scheduled' ? parseInt(duration) : null
      };

      // Send emails via backend
      const response = await fetch(`${process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api'}/meetings/jitsi/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (data.success) {
        setJitsiRoom({ 
          roomName, 
          meetingLink,
          meetingTitle,
          scheduledMeetingId: data.scheduledMeetingId
        });
        
        // Only show Jitsi iframe if meeting is starting now
        if (meetingType === 'now') {
          setShowJitsi(true);
        }
        
        copyToClipboard(meetingLink);
        
        const successMessage = meetingType === 'scheduled' 
          ? `Meeting scheduled! Invitations sent to ${selectedAttendees.length} attendees.`
          : `Meeting created! Invitations sent to ${selectedAttendees.length} attendees.`;
        
        setSnackbar({ 
          open: true, 
          message: successMessage, 
          severity: 'success' 
        });

        // If scheduled, close modal after 2 seconds
        if (meetingType === 'scheduled') {
          // Refresh scheduled meetings list
          fetchScheduledMeetings();
          setTimeout(() => {
            handleClose();
          }, 2000);
        }
      } else {
        setSnackbar({ open: true, message: `Error: ${data.message || 'Failed to create meeting'}`, severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: `Error: ${err.message}`, severity: 'error' });
    }
    setLoading(false);
  };

  // Reset form when closing
  const handleClose = () => {
    // End meeting attendance if a meeting was active
    if (showJitsi && currentMeetingId && jitsiRoom?.scheduledMeetingId) {
      console.log('Admin clicked End Meeting, finalizing attendance...');
      fetch(`${process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api'}/meetings/attendance/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          meetingId: currentMeetingId,
          scheduledMeetingId: jitsiRoom.scheduledMeetingId
        })
      }).catch(err => console.error('Failed to end meeting on close:', err));
    }

    // Cleanup Jitsi API
    if (jitsiApi) {
      jitsiApi.dispose();
      setJitsiApi(null);
    }
    
    setShowJitsi(false);
    setCurrentMeetingId(null);
    setJitsiRoom(null);
    setMeetingTitle('');
    setSelectedAttendees([]);
    setSearchFSE('');
    setSearchTL('');
    setSearchManager('');
    setMeetingType('now');
    setScheduledDate('');
    setScheduledTime('');
    setDuration('30');
    setLiveAttendance([]);
    setMeetingStartTime(null);
    onClose();
  };

  // Get minimum date (today) for date picker
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get minimum time for today
  const getMinTime = () => {
    if (scheduledDate === getMinDate()) {
      const now = new Date();
      return now.toTimeString().slice(0, 5);
    }
    return '00:00';
  };

  // Delete/Cancel meeting
  const handleDeleteMeeting = async (meetingId) => {
    if (!window.confirm('Are you sure you want to cancel this meeting?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api'}/meetings/jitsi/${meetingId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setSnackbar({ open: true, message: 'Meeting cancelled successfully', severity: 'success' });
        fetchScheduledMeetings();
      } else {
        setSnackbar({ open: true, message: 'Failed to cancel meeting', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: `Error: ${err.message}`, severity: 'error' });
    }
  };

  // Join scheduled meeting (open in modal)
  const handleJoinScheduledMeeting = (meeting) => {
    setJitsiRoom({ 
      roomName: meeting.roomName, 
      meetingLink: meeting.meetingLink,
      meetingTitle: meeting.title,
      scheduledMeetingId: meeting._id
    });
    setShowJitsi(true);
    copyToClipboard(meeting.meetingLink);
  };

  // Initialize Jitsi External API
  useEffect(() => {
    if (showJitsi && jitsiRoom && !jitsiApi) {
      // Wait for DOM to be ready
      const initializeJitsi = () => {
        // Check if container is ready
        if (!jitsiContainerRef.current) {
          console.error('Jitsi container not ready yet');
          return;
        }

        // Check if Jitsi API is loaded
        if (!window.JitsiMeetExternalAPI) {
          console.error('Jitsi External API not loaded');
          return;
        }

        console.log('Initializing Jitsi with container:', jitsiContainerRef.current);

        const domain = 'meet.jit.si';
        const options = {
          roomName: jitsiRoom.roomName,
          width: '100%',
          height: '100%',
          parentNode: jitsiContainerRef.current,
          userInfo: {
            displayName: 'Admin - Vegavruddhi'
          },
          configOverwrite: {
            prejoinPageEnabled: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false
          }
        };

        try {
          const api = new window.JitsiMeetExternalAPI(domain, options);
          setJitsiApi(api);
          setMeetingStartTime(new Date());

          // Generate unique meeting ID
          const meetingId = `${jitsiRoom.roomName}-${Date.now()}`;
          setCurrentMeetingId(meetingId); // Save to state for handleClose

          // Start attendance tracking
          fetch(`${process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api'}/meetings/attendance/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              meetingId,
              roomName: jitsiRoom.roomName,
              meetingTitle: jitsiRoom.meetingTitle || 'Jitsi Meeting',
              meetingLink: jitsiRoom.meetingLink,
              scheduledMeetingId: jitsiRoom.scheduledMeetingId
            })
          }).catch(err => console.error('Failed to start attendance tracking:', err));

          // Listen to participant joined event
          api.addEventListener('participantJoined', (event) => {
            console.log('Participant joined:', event);
            const participant = {
              participantId: event.id,
              name: event.displayName || 'Unknown',
              joinTime: new Date(),
              status: 'in-meeting'
            };
            
            setLiveAttendance(prev => [...prev, participant]);

            // Save to backend
            fetch(`${process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api'}/meetings/attendance/join`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                meetingId,
                participantId: event.id,
                name: event.displayName || 'Unknown',
                email: ''
              })
            }).catch(err => console.error('Failed to record join:', err));
          });

          // Listen to participant left event
          api.addEventListener('participantLeft', (event) => {
            console.log('Participant left:', event);
            setLiveAttendance(prev => 
              prev.map(p => 
                p.participantId === event.id 
                  ? { ...p, leaveTime: new Date(), status: 'left' }
                  : p
              )
            );

            // Save to backend
            fetch(`${process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api'}/meetings/attendance/leave`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                meetingId,
                participantId: event.id
              })
            }).catch(err => console.error('Failed to record leave:', err));
          });

          // Listen to video conference left (admin leaves)
          api.addEventListener('videoConferenceLeft', () => {
            console.log('Admin left the meeting');
            
            // End meeting attendance tracking AND update meeting status
            fetch(`${process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api'}/meetings/attendance/end`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                meetingId,
                scheduledMeetingId: jitsiRoom.scheduledMeetingId // Pass this to update meeting status
              })
            }).catch(err => console.error('Failed to end meeting:', err));
          });

          console.log('Jitsi initialized successfully');
        } catch (error) {
          console.error('Error initializing Jitsi:', error);
        }
      };

      // Wait for DOM to be ready before initializing
      const timer = setTimeout(initializeJitsi, 200);

      // Cleanup
      return () => {
        clearTimeout(timer);
        if (jitsiApi) {
          jitsiApi.dispose();
        }
      };
    }
  }, [showJitsi, jitsiRoom, jitsiApi]);

  // Calculate duration for live participants
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    if (showJitsi) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showJitsi]);

  const formatDuration = (startTime) => {
    const diff = Math.floor((currentTime - new Date(startTime)) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}m ${seconds}s`;
  };

  // Group meetings by date
  const groupedMeetings = useMemo(() => {
    const groups = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    scheduledMeetings
      .filter(m => m.status === 'scheduled')
      .forEach(meeting => {
        const meetingDate = new Date(meeting.scheduledDateTime);
        meetingDate.setHours(0, 0, 0, 0);
        
        let dateKey;
        if (meetingDate.getTime() === today.getTime()) {
          dateKey = 'Today';
        } else if (meetingDate.getTime() === tomorrow.getTime()) {
          dateKey = 'Tomorrow';
        } else {
          dateKey = meetingDate.toLocaleDateString('en-IN', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          });
        }
        
        if (!groups[dateKey]) {
          groups[dateKey] = {
            date: meetingDate,
            meetings: [],
            totalDuration: 0,
            totalAttendees: 0
          };
        }
        
        groups[dateKey].meetings.push(meeting);
        groups[dateKey].totalDuration += meeting.duration;
        groups[dateKey].totalAttendees += meeting.attendees.length;
      });
    
    return groups;
  }, [scheduledMeetings]);

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth={showJitsi ? 'md' : 'lg'} 
        fullWidth
        fullScreen={showJitsi} // Full screen when showing video
        PaperProps={{
          sx: {
            maxHeight: showJitsi ? '100vh' : '90vh',
            m: showJitsi ? 0 : 2
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: BRAND.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VideocamIcon />
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Schedule Meeting
            </Typography>
          </Box>
          <IconButton onClick={handleClose} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          {!showJitsi ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 400px' }, gap: 3 }}>
              {/* LEFT COLUMN: Meeting Form */}
              <Box>
              <TextField
                fullWidth
                label="Meeting Title"
                value={meetingTitle}
                onChange={e => setMeetingTitle(e.target.value)}
                margin="dense"
                placeholder="e.g., Team Standup, Performance Review"
                size="small"
              />

              {/* Meeting Type Selection */}
              <FormControl component="fieldset" sx={{ mt: 2, mb: 1 }}>
                <FormLabel component="legend" sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' }, fontWeight: 600 }}>
                  Meeting Type
                </FormLabel>
                <RadioGroup
                  row
                  value={meetingType}
                  onChange={(e) => setMeetingType(e.target.value)}
                >
                  <FormControlLabel 
                    value="now" 
                    control={<Radio size="small" />} 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PlayArrowIcon fontSize="small" />
                        <Typography sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>Start Now</Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel 
                    value="scheduled" 
                    control={<Radio size="small" />} 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ScheduleIcon fontSize="small" />
                        <Typography sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>Schedule for Later</Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>

              {/* Scheduling Fields */}
              {meetingType === 'scheduled' && (
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, 
                  gap: 1.5, 
                  mb: 2,
                  p: 2,
                  bgcolor: '#f5f5f5',
                  borderRadius: 1,
                  border: '1px solid #ddd'
                }}>
                  <TextField
                    fullWidth
                    label="Date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: getMinDate() }}
                  />
                  <TextField
                    fullWidth
                    label="Time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: getMinTime() }}
                  />
                  <FormControl fullWidth size="small">
                    <InputLabel>Duration</InputLabel>
                    <Select
                      value={duration}
                      label="Duration"
                      onChange={(e) => setDuration(e.target.value)}
                    >
                      <MenuItem value="15">15 minutes</MenuItem>
                      <MenuItem value="30">30 minutes</MenuItem>
                      <MenuItem value="45">45 minutes</MenuItem>
                      <MenuItem value="60">1 hour</MenuItem>
                      <MenuItem value="90">1.5 hours</MenuItem>
                      <MenuItem value="120">2 hours</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}

              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 700, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                Select Attendees ({selectedAttendees.length} selected)
              </Typography>

              {/* Selected Attendees Summary */}
              {selectedAttendees.length > 0 && (
                <Alert severity="success" sx={{ mb: 1.5, py: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                    Selected Attendees:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selectedAttendees.map(id => {
                      const person = allAttendees.find(a => a._id === id);
                      if (!person) return null;
                      return (
                        <Chip
                          key={id}
                          label={`${person.name} (${person.type})`}
                          size="small"
                          onDelete={() => handlePersonSelect(person, false)}
                          sx={{ 
                            fontSize: { xs: 9, sm: 10 },
                            height: { xs: 20, sm: 22 },
                            bgcolor: person.type === 'Manager' ? '#ffebee' : person.type === 'TL' ? '#e8f5e9' : '#e3f2fd'
                          }}
                        />
                      );
                    })}
                  </Box>
                </Alert>
              )}

              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, 
                gap: { xs: 1.5, sm: 2 } 
              }}>
                {/* FSE Column */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1565c0', fontSize: 12 }}>
                      FSEs ({filteredFSEs.length})
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Checkbox
                        checked={filteredFSEs.length > 0 && filteredFSEs.every(a => selectedAttendees.includes(a._id))}
                        indeterminate={filteredFSEs.some(a => selectedAttendees.includes(a._id)) && !filteredFSEs.every(a => selectedAttendees.includes(a._id))}
                        onChange={(e) => handleSelectAllFSE(e.target.checked)}
                        size="small"
                      />
                      <Typography variant="caption" sx={{ fontSize: 10 }}>All</Typography>
                    </Box>
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search..."
                    value={searchFSE}
                    onChange={(e) => setSearchFSE(e.target.value)}
                    sx={{ mb: 1 }}
                  />
                  <List sx={{ 
                    maxHeight: { xs: 200, sm: 300 }, 
                    overflow: 'auto', 
                    border: '1px solid #ddd', 
                    borderRadius: 1 
                  }}>
                    {filteredFSEs.map(attendee => (
                      <ListItem key={attendee._id} dense>
                        <Checkbox
                          checked={selectedAttendees.includes(attendee._id)}
                          onChange={e => handlePersonSelect(attendee, e.target.checked)}
                          size="small"
                        />
                        <ListItemText 
                          primary={attendee.name} 
                          secondary={attendee.email}
                          primaryTypographyProps={{ fontSize: { xs: 11, sm: 12 }, fontWeight: 600 }}
                          secondaryTypographyProps={{ fontSize: { xs: 9, sm: 10 } }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>

                {/* TL Column */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2e7d32', fontSize: 12 }}>
                      TLs ({filteredTLs.length})
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Checkbox
                        checked={filteredTLs.length > 0 && filteredTLs.every(a => selectedAttendees.includes(a._id))}
                        indeterminate={filteredTLs.some(a => selectedAttendees.includes(a._id)) && !filteredTLs.every(a => selectedAttendees.includes(a._id))}
                        onChange={(e) => handleSelectAllTL(e.target.checked)}
                        size="small"
                      />
                      <Typography variant="caption" sx={{ fontSize: 10 }}>All</Typography>
                    </Box>
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search..."
                    value={searchTL}
                    onChange={(e) => setSearchTL(e.target.value)}
                    sx={{ mb: 1 }}
                  />
                  <List sx={{ 
                    maxHeight: { xs: 200, sm: 300 }, 
                    overflow: 'auto', 
                    border: '1px solid #ddd', 
                    borderRadius: 1 
                  }}>
                    {filteredTLs.map(attendee => (
                      <ListItem key={attendee._id} dense>
                        <Checkbox
                          checked={selectedAttendees.includes(attendee._id)}
                          onChange={e => handlePersonSelect(attendee, e.target.checked)}
                          size="small"
                        />
                        <ListItemText 
                          primary={attendee.name} 
                          secondary={attendee.email}
                          primaryTypographyProps={{ fontSize: { xs: 11, sm: 12 }, fontWeight: 600 }}
                          secondaryTypographyProps={{ fontSize: { xs: 9, sm: 10 } }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>

                {/* Manager Column */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#d32f2f', fontSize: 12 }}>
                      Managers ({filteredManagers.length})
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Checkbox
                        checked={filteredManagers.length > 0 && filteredManagers.every(a => selectedAttendees.includes(a._id))}
                        indeterminate={filteredManagers.some(a => selectedAttendees.includes(a._id)) && !filteredManagers.every(a => selectedAttendees.includes(a._id))}
                        onChange={(e) => handleSelectAllManager(e.target.checked)}
                        size="small"
                      />
                      <Typography variant="caption" sx={{ fontSize: 10 }}>All</Typography>
                    </Box>
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search..."
                    value={searchManager}
                    onChange={(e) => setSearchManager(e.target.value)}
                    sx={{ mb: 1 }}
                  />
                  <List sx={{ 
                    maxHeight: { xs: 200, sm: 300 }, 
                    overflow: 'auto', 
                    border: '1px solid #ddd', 
                    borderRadius: 1 
                  }}>
                    {filteredManagers.map(attendee => (
                      <ListItem key={attendee._id} dense>
                        <Checkbox
                          checked={selectedAttendees.includes(attendee._id)}
                          onChange={e => handlePersonSelect(attendee, e.target.checked)}
                          size="small"
                        />
                        <ListItemText 
                          primary={attendee.name} 
                          secondary={attendee.email}
                          primaryTypographyProps={{ fontSize: { xs: 11, sm: 12 }, fontWeight: 600 }}
                          secondaryTypographyProps={{ fontSize: { xs: 9, sm: 10 } }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Box>
            </Box>
            
            {/* RIGHT COLUMN: Scheduled Meetings List */}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <Paper elevation={2} sx={{ height: '100%', maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2, bgcolor: BRAND.primary, color: '#fff' }}>
                  <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon /> Scheduled Meetings
                  </Typography>
                </Box>
                
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                  {loadingMeetings ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                      <CircularProgress size={40} />
                    </Box>
                  ) : Object.keys(groupedMeetings).length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4, color: '#999' }}>
                      <ScheduleIcon sx={{ fontSize: 60, opacity: 0.3, mb: 2 }} />
                      <Typography variant="body2">No scheduled meetings</Typography>
                    </Box>
                  ) : (
                    Object.entries(groupedMeetings).map(([dateLabel, group]) => (
                      <Box key={dateLabel} sx={{ mb: 3 }}>
                        {/* Date Header */}
                        <Typography variant="subtitle2" sx={{ 
                          fontWeight: 700, 
                          color: BRAND.primary, 
                          mb: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }}>
                          📅 {dateLabel}
                        </Typography>
                        
                        {/* Meetings for this date */}
                        {group.meetings.map(meeting => {
                          const meetingDateTime = new Date(meeting.scheduledDateTime);
                          const timeStr = meetingDateTime.toLocaleTimeString('en-IN', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true
                          });
                          
                          return (
                            <Card key={meeting._id} sx={{ mb: 1.5, boxShadow: 1 }}>
                              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" fontWeight={700} sx={{ color: '#1a3b2a', mb: 0.5 }}>
                                      {meeting.title}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                      <Chip 
                                        icon={<AccessTimeIcon />} 
                                        label={`${timeStr} • ${meeting.duration} min`}
                                        size="small"
                                        sx={{ fontSize: 10, height: 20 }}
                                      />
                                      <Chip 
                                        icon={<PeopleIcon />} 
                                        label={`${meeting.attendees.length} attendees`}
                                        size="small"
                                        sx={{ fontSize: 10, height: 20 }}
                                      />
                                    </Box>
                                  </Box>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleDeleteMeeting(meeting._id)}
                                    sx={{ color: '#d32f2f' }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                                
                                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<LaunchIcon />}
                                    onClick={() => handleJoinScheduledMeeting(meeting)}
                                    sx={{ 
                                      flex: 1,
                                      fontSize: 10,
                                      py: 0.5,
                                      bgcolor: BRAND.primary,
                                      '&:hover': { bgcolor: '#0f3320' }
                                    }}
                                  >
                                    Join
                                  </Button>
                                  <Tooltip title="Copy Link">
                                    <IconButton 
                                      size="small"
                                      onClick={() => copyToClipboard(meeting.meetingLink)}
                                      sx={{ border: '1px solid #ddd' }}
                                    >
                                      <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </CardContent>
                            </Card>
                          );
                        })}
                        
                        {/* Daily Summary */}
                        <Box sx={{ 
                          mt: 1, 
                          p: 1, 
                          bgcolor: '#f5f5f5', 
                          borderRadius: 1,
                          border: '1px solid #e0e0e0'
                        }}>
                          <Typography variant="caption" sx={{ color: '#666', fontSize: 10 }}>
                            <strong>Total:</strong> {group.meetings.length} meeting{group.meetings.length > 1 ? 's' : ''} • {Math.floor(group.totalDuration / 60)}h {group.totalDuration % 60}m • {group.totalAttendees} attendees
                          </Typography>
                        </Box>
                      </Box>
                    ))
                  )}
                </Box>
              </Paper>
            </Box>
          </Box>
          ) : (
            // Jitsi Video Conference with Live Attendance
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 350px' }, gap: 2, p: 0 }}>
              {/* LEFT: Video Conference */}
              <Box sx={{ p: 0 }}>
                <Alert severity="success" sx={{ mb: { xs: 1, sm: 2 }, mx: { xs: 1, sm: 2 }, mt: { xs: 1, sm: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, wordBreak: 'break-all' }}>
                      <strong>Meeting Link:</strong> {jitsiRoom.meetingLink}
                    </Box>
                    <Tooltip title="Copy Link">
                      <IconButton size="small" onClick={() => copyToClipboard(jitsiRoom.meetingLink)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Alert>

                <Box 
                  ref={jitsiContainerRef}
                  sx={{ 
                    width: '100%', 
                    height: { xs: 'calc(100vh - 250px)', sm: '60vh' },
                    border: { xs: 'none', sm: '2px solid #ddd' },
                    borderRadius: { xs: 0, sm: 2 },
                    overflow: 'hidden',
                    mx: { xs: 0, sm: 2 },
                    mb: { xs: 0, sm: 2 }
                  }}
                />
              </Box>

              {/* RIGHT: Live Attendance Panel */}
              <Box sx={{ display: { xs: 'none', md: 'block' }, p: 2 }}>
                <Paper elevation={3} sx={{ height: '100%', maxHeight: '65vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ p: 2, bgcolor: BRAND.primary, color: '#fff' }}>
                    <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PeopleIcon /> Live Attendance
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      {liveAttendance.filter(p => p.status === 'in-meeting').length} currently in meeting
                    </Typography>
                  </Box>
                  
                  <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {liveAttendance.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4, color: '#999' }}>
                        <PeopleIcon sx={{ fontSize: 60, opacity: 0.3, mb: 2 }} />
                        <Typography variant="body2">Waiting for participants...</Typography>
                      </Box>
                    ) : (
                      <>
                        {/* Currently in Meeting */}
                        {liveAttendance.filter(p => p.status === 'in-meeting').length > 0 && (
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: BRAND.primary, mb: 1 }}>
                              ✅ In Meeting ({liveAttendance.filter(p => p.status === 'in-meeting').length})
                            </Typography>
                            {liveAttendance.filter(p => p.status === 'in-meeting').map(participant => (
                              <Card key={participant.participantId} sx={{ mb: 1, bgcolor: '#e8f5e9' }}>
                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: 13 }}>
                                    {participant.name}
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block', color: '#666', fontSize: 11 }}>
                                    Joined: {new Date(participant.joinTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </Typography>
                                  <Chip 
                                    icon={<AccessTimeIcon />}
                                    label={formatDuration(participant.joinTime)}
                                    size="small"
                                    sx={{ mt: 0.5, fontSize: 10, height: 20, bgcolor: '#4caf50', color: '#fff' }}
                                  />
                                </CardContent>
                              </Card>
                            ))}
                          </Box>
                        )}

                        {/* Left Meeting */}
                        {liveAttendance.filter(p => p.status === 'left').length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#d32f2f', mb: 1 }}>
                              ❌ Left Meeting ({liveAttendance.filter(p => p.status === 'left').length})
                            </Typography>
                            {liveAttendance.filter(p => p.status === 'left').map(participant => (
                              <Card key={participant.participantId} sx={{ mb: 1, bgcolor: '#ffebee' }}>
                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: 13 }}>
                                    {participant.name}
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block', color: '#666', fontSize: 11 }}>
                                    Joined: {new Date(participant.joinTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block', color: '#666', fontSize: 11 }}>
                                    Left: {new Date(participant.leaveTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </Typography>
                                  <Chip 
                                    label={formatDuration(participant.joinTime)}
                                    size="small"
                                    sx={{ mt: 0.5, fontSize: 10, height: 20 }}
                                  />
                                </CardContent>
                              </Card>
                            ))}
                          </Box>
                        )}
                      </>
                    )}
                  </Box>

                  {/* Meeting Summary */}
                  {meetingStartTime && (
                    <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderTop: '1px solid #ddd' }}>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 0.5 }}>
                        Meeting Duration
                      </Typography>
                      <Typography variant="body2" sx={{ color: BRAND.primary, fontWeight: 700 }}>
                        {formatDuration(meetingStartTime)}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} sx={{ color: BRAND.primary }}>
            {showJitsi ? 'End Meeting' : 'Cancel'}
          </Button>
          {!showJitsi && (
            <Button 
              variant="contained" 
              onClick={handleCreateMeeting}
              disabled={loading || selectedAttendees.length === 0 || !meetingTitle.trim()}
              startIcon={loading ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : (meetingType === 'scheduled' ? <ScheduleIcon /> : <VideocamIcon />)}
              sx={{ bgcolor: BRAND.primary, '&:hover': { bgcolor: '#0f3320' } }}
            >
              {loading ? 'Creating...' : (meetingType === 'scheduled' ? 'Schedule Meeting' : 'Start Meeting Now')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
