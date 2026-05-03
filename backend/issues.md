
``` postgres
-- 75 Sample Tickets (distributed across statuses, priorities, types, timestamps)
-- Mix: 15 pending_routing, 20 open, 15 assigned, 15 in_progress, 5 resolved, 5 closed

WITH user_ids AS (
  SELECT id, email FROM users WHERE role = 'user'
),
cat_ids AS (
  SELECT id FROM categories LIMIT 8
)
INSERT INTO tickets (title, description, category_id, type, priority, status, submitted_by, replication_steps, created_at)
-- Pending Routing (15) - will be routed by AI
SELECT
  'Laptop screen flickering randomly',
  'Screen flickers every 5-10 seconds, very distracting',
  (SELECT id FROM categories WHERE name = 'Hardware Issues' LIMIT 1),
  'hardware'::ticket_type,
  'P2'::ticket_priority,
  'pending_routing'::ticket_status,
  (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1),
  'Turn on laptop, wait 2 min, screen flickers intermittently',
  NOW() - INTERVAL '5 days'
UNION ALL SELECT 'VPN connection drops every hour', 'VPN disconnects without warning, need to reconnect', (SELECT id FROM categories WHERE name = 'Network & Connectivity' LIMIT 1), 'software'::ticket_type, 'P3'::ticket_priority, 'pending_routing'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Open VPN client, connect, wait 60min', NOW() - INTERVAL '4 days'
UNION ALL SELECT 'Printer not responding', 'Network printer offline on work subnet', (SELECT id FROM categories WHERE name = 'Hardware Issues' LIMIT 1), 'hardware'::ticket_type, 'P3'::ticket_priority, 'pending_routing'::ticket_status, (SELECT id FROM user_ids WHERE email = 'michael.brown@example.com' LIMIT 1), 'Check printer IP, ping from workstation', NOW() - INTERVAL '3 days'
UNION ALL SELECT 'Email sync issues on mobile', 'Calendar not syncing with mobile Outlook', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'pending_routing'::ticket_status, (SELECT id FROM user_ids WHERE email = 'emily.johnson@example.com' LIMIT 1), 'Delete and re-add account in Outlook mobile', NOW() - INTERVAL '2 days'
UNION ALL SELECT 'Monitor USB hub not recognized', 'USB hub on monitor not detected by system', (SELECT id FROM categories WHERE name = 'Hardware Issues' LIMIT 1), 'hardware'::ticket_type, 'P3'::ticket_priority, 'pending_routing'::ticket_status, (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1), 'Plug monitor USB, check device manager', NOW() - INTERVAL '1 day'
UNION ALL SELECT 'Slack crashing on startup', 'Slack app crashes immediately after launch', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'bug'::ticket_type, 'P2'::ticket_priority, 'pending_routing'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Launch Slack, observe crash in logs', NOW() - INTERVAL '6 hours'
UNION ALL SELECT 'Password reset not working', 'Forgot password link returns error', (SELECT id FROM categories WHERE name = 'Account & Access' LIMIT 1), 'software'::ticket_type, 'P1'::ticket_priority, 'pending_routing'::ticket_status, (SELECT id FROM user_ids WHERE email = 'michael.brown@example.com' LIMIT 1), 'Click forgot password, check email', NOW() - INTERVAL '4 hours'
UNION ALL SELECT 'Disk space critical', 'C: drive 95% full, slowing system down', (SELECT id FROM categories WHERE name = 'Performance' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'pending_routing'::ticket_status, (SELECT id FROM user_ids WHERE email = 'emily.johnson@example.com' LIMIT 1), 'Check Disk Management, identify large files', NOW() - INTERVAL '3 hours'
UNION ALL SELECT 'Teams background blur not working', 'Blur button disabled in Teams', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'bug'::ticket_type, 'P4'::ticket_priority, 'pending_routing'::ticket_status, (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1), 'Join Teams call, check blur option', NOW() - INTERVAL '2 hours'
UNION ALL SELECT 'External monitor not detected', 'Second monitor not showing in display settings', (SELECT id FROM categories WHERE name = 'Hardware Issues' LIMIT 1), 'hardware'::ticket_type, 'P2'::ticket_priority, 'pending_routing'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Connect monitor, run hardware detect', NOW() - INTERVAL '1 hour'
UNION ALL SELECT 'Outlook calendar sharing not syncing', 'Shared calendar shows old events', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'software'::ticket_type, 'P3'::ticket_priority, 'pending_routing'::ticket_status, (SELECT id FROM user_ids WHERE email = 'michael.brown@example.com' LIMIT 1), 'Open shared calendar, refresh', NOW() - INTERVAL '30 min'
UNION ALL SELECT 'Network drive inaccessible', 'Z: drive gives access denied error', (SELECT id FROM categories WHERE name = 'Network & Connectivity' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'pending_routing'::ticket_status, (SELECT id FROM user_ids WHERE email = 'emily.johnson@example.com' LIMIT 1), 'Map network drive, check permissions', NOW() - INTERVAL '25 min'
UNION ALL SELECT 'Backup job failing silently', 'Backup hasn''t run in 3 days', (SELECT id FROM categories WHERE name = 'Data & Storage' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'pending_routing'::ticket_status, (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1), 'Check backup logs, retry job', NOW() - INTERVAL '20 min'
UNION ALL SELECT 'Browser crashing with specific website', 'Chrome crashes on internal portal', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'bug'::ticket_type, 'P3'::ticket_priority, 'pending_routing'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Visit portal URL, reproduce crash', NOW() - INTERVAL '15 min'
UNION ALL SELECT 'Fingerprint reader not working', 'Windows Hello fingerprint rejected', (SELECT id FROM categories WHERE name = 'Hardware Issues' LIMIT 1), 'hardware'::ticket_type, 'P3'::ticket_priority, 'pending_routing'::ticket_status, (SELECT id FROM user_ids WHERE email = 'michael.brown@example.com' LIMIT 1), 'Enroll fingerprint again in settings', NOW() - INTERVAL '10 min'

-- Open (20)
UNION ALL SELECT 'Cannot print double-sided', 'Duplex printing grayed out in driver', (SELECT id FROM categories WHERE name = 'Hardware Issues' LIMIT 1), 'hardware'::ticket_type, 'P4'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'emily.johnson@example.com' LIMIT 1), 'Open print properties, check duplex option', NOW() - INTERVAL '8 days'
UNION ALL SELECT 'Webcam in meetings black screen', 'Video feed shows black in Teams', (SELECT id FROM categories WHERE name = 'Hardware Issues' LIMIT 1), 'hardware'::ticket_type, 'P2'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1), 'Start Teams call, enable camera', NOW() - INTERVAL '7 days'
UNION ALL SELECT 'OneDrive sync delay', 'Files take hours to sync', (SELECT id FROM categories WHERE name = 'Data & Storage' LIMIT 1), 'software'::ticket_type, 'P3'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Upload file, monitor sync status', NOW() - INTERVAL '6 days'
UNION ALL SELECT 'Excel file corrupted', 'Spreadsheet won''t open, shows recovery prompt', (SELECT id FROM categories WHERE name = 'Data & Storage' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'michael.brown@example.com' LIMIT 1), 'Try opening backup copy', NOW() - INTERVAL '5 days'
UNION ALL SELECT 'Proxy authentication failing', 'Proxy prompts every 10 minutes', (SELECT id FROM categories WHERE name = 'Network & Connectivity' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'emily.johnson@example.com' LIMIT 1), 'Check proxy settings, clear cache', NOW() - INTERVAL '4 days'
UNION ALL SELECT 'Mouse pointer lag', 'Cursor jumps and delays', (SELECT id FROM categories WHERE name = 'Hardware Issues' LIMIT 1), 'hardware'::ticket_type, 'P3'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1), 'Check mouse battery, update driver', NOW() - INTERVAL '3 days'
UNION ALL SELECT 'Zoom audio echo feedback', 'Hearing own voice delayed in calls', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'software'::ticket_type, 'P3'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Join test meeting, check audio settings', NOW() - INTERVAL '2 days'
UNION ALL SELECT 'App won''t update', 'Microsoft Store update stuck pending', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'software'::ticket_type, 'P3'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'michael.brown@example.com' LIMIT 1), 'Restart Store app, retry update', NOW() - INTERVAL '2 days'
UNION ALL SELECT 'Desktop shortcuts disappeared', 'Icons vanished from desktop after restart', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'bug'::ticket_type, 'P2'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'emily.johnson@example.com' LIMIT 1), 'Check recycle bin, restore shortcuts', NOW() - INTERVAL '1 day'
UNION ALL SELECT 'Keyboard keys sticking', 'Space bar requires hard press', (SELECT id FROM categories WHERE name = 'Hardware Issues' LIMIT 1), 'hardware'::ticket_type, 'P3'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1), 'Clean under keys, test each key', NOW() - INTERVAL '1 day'
UNION ALL SELECT 'Two-factor code not arriving', 'SMS 2FA code delayed or missing', (SELECT id FROM categories WHERE name = 'Account & Access' LIMIT 1), 'software'::ticket_type, 'P1'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Request resend code, check spam', NOW() - INTERVAL '18 hours'
UNION ALL SELECT 'Windows Defender scanning slow', 'Full scan takes 6+ hours', (SELECT id FROM categories WHERE name = 'Performance' LIMIT 1), 'software'::ticket_type, 'P3'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'michael.brown@example.com' LIMIT 1), 'Run scheduled scan, check CPU usage', NOW() - INTERVAL '12 hours'
UNION ALL SELECT 'Bluetooth keeps disconnecting', 'Headset loses connection frequently', (SELECT id FROM categories WHERE name = 'Hardware Issues' LIMIT 1), 'hardware'::ticket_type, 'P2'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'emily.johnson@example.com' LIMIT 1), 'Repair Bluetooth device, update drivers', NOW() - INTERVAL '10 hours'
UNION ALL SELECT 'Salesforce login timeout', 'Session expires after 15 minutes inactivity', (SELECT id FROM categories WHERE name = 'Integration Issues' LIMIT 1), 'software'::ticket_type, 'P3'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1), 'Login and check session timeout setting', NOW() - INTERVAL '8 hours'
UNION ALL SELECT 'PDF reader crashing', 'Adobe Reader crashes opening large PDFs', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'bug'::ticket_type, 'P2'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Open large PDF, observe crash', NOW() - INTERVAL '6 hours'
UNION ALL SELECT 'Network latency spike', 'Ping response time 500+ms', (SELECT id FROM categories WHERE name = 'Network & Connectivity' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'michael.brown@example.com' LIMIT 1), 'Run tracert, check network stats', NOW() - INTERVAL '4 hours'
UNION ALL SELECT 'Antivirus quarantine blocking file', 'Needed file removed by security scan', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'software'::ticket_type, 'P3'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'emily.johnson@example.com' LIMIT 1), 'Check quarantine, restore file', NOW() - INTERVAL '3 hours'
UNION ALL SELECT 'Dock not showing all apps', 'Recently used apps hidden from dock', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'bug'::ticket_type, 'P4'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1), 'Check dock preferences, re-add apps', NOW() - INTERVAL '2 hours'
UNION ALL SELECT 'Password expired notification loop', 'Can''t change password, stuck in notification', (SELECT id FROM categories WHERE name = 'Account & Access' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'open'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Try password change portal', NOW() - INTERVAL '1 hour'

-- Assigned (15)
UNION ALL SELECT 'Laptop running hot', 'Fan constantly running, temps 85C+', (SELECT id FROM categories WHERE name = 'Hardware Issues' LIMIT 1), 'hardware'::ticket_type, 'P2'::ticket_priority, 'assigned'::ticket_status, (SELECT id FROM user_ids WHERE email = 'michael.brown@example.com' LIMIT 1), 'Check task manager CPU, monitor temps', NOW() - INTERVAL '10 days'
UNION ALL SELECT 'Monitor color calibration off', 'Colors washed out compared to other displays', (SELECT id FROM categories WHERE name = 'Hardware Issues' LIMIT 1), 'hardware'::ticket_type, 'P3'::ticket_priority, 'assigned'::ticket_status, (SELECT id FROM user_ids WHERE email = 'emily.johnson@example.com' LIMIT 1), 'Run color calibration tool', NOW() - INTERVAL '9 days'
UNION ALL SELECT 'File permission denied errors', 'Can''t modify files in shared folder', (SELECT id FROM categories WHERE name = 'Account & Access' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'assigned'::ticket_status, (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1), 'Check folder properties, verify permissions', NOW() - INTERVAL '8 days'
UNION ALL SELECT 'Chrome extensions disabled', 'All extensions auto-disabled unexpectedly', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'assigned'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Enable extensions in Chrome settings', NOW() - INTERVAL '7 days'
UNION ALL SELECT 'Slack notification sound not working', 'Muted despite notification settings', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'software'::ticket_type, 'P3'::ticket_priority, 'assigned'::ticket_status, (SELECT id FROM user_ids WHERE email = 'michael.brown@example.com' LIMIT 1), 'Check OS sound settings, Slack settings', NOW() - INTERVAL '6 days'
UNION ALL SELECT 'USB drive not recognized', 'External drive not detected in File Explorer', (SELECT id FROM categories WHERE name = 'Hardware Issues' LIMIT 1), 'hardware'::ticket_type, 'P3'::ticket_priority, 'assigned'::ticket_status, (SELECT id FROM user_ids WHERE email = 'emily.johnson@example.com' LIMIT 1), 'Try different USB port, check device manager', NOW() - INTERVAL '5 days'
UNION ALL SELECT 'Calendar invites not displaying', 'Meeting requests not showing in calendar', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'assigned'::ticket_status, (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1), 'Check calendar permissions, resync', NOW() - INTERVAL '4 days'
UNION ALL SELECT 'Internet disconnects randomly', 'WiFi drops 3-4 times daily', (SELECT id FROM categories WHERE name = 'Network & Connectivity' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'assigned'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Check router logs, update driver', NOW() - INTERVAL '3 days'
UNION ALL SELECT 'RAM upgrade causing crashes', 'System unstable after adding RAM', (SELECT id FROM categories WHERE name = 'Hardware Issues' LIMIT 1), 'hardware'::ticket_type, 'P2'::ticket_priority, 'assigned'::ticket_status, (SELECT id FROM user_ids WHERE email = 'michael.brown@example.com' LIMIT 1), 'Run memory test, check RAM seating', NOW() - INTERVAL '2 days'
UNION ALL SELECT 'Boot time excessive', 'Windows takes 5+ minutes to startup', (SELECT id FROM categories WHERE name = 'Performance' LIMIT 1), 'software'::ticket_type, 'P3'::ticket_priority, 'assigned'::ticket_status, (SELECT id FROM user_ids WHERE email = 'emily.johnson@example.com' LIMIT 1), 'Disable startup programs, run disk check', NOW() - INTERVAL '2 days'
UNION ALL SELECT 'Duplicate files in backup', 'Backup size doubled from dedup failure', (SELECT id FROM categories WHERE name = 'Data & Storage' LIMIT 1), 'software'::ticket_type, 'P3'::ticket_priority, 'assigned'::ticket_status, (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1), 'Clean backup, re-enable deduplication', NOW() - INTERVAL '1 day'
UNION ALL SELECT 'Google Drive sync conflicts', 'Multiple conflicting versions of files', (SELECT id FROM categories WHERE name = 'Data & Storage' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'assigned'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Resolve conflicts, delete duplicates', NOW() - INTERVAL '1 day'
UNION ALL SELECT 'Outlook freezing on startup', 'Email client hangs for 30 seconds', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'assigned'::ticket_status, (SELECT id FROM user_ids WHERE email = 'michael.brown@example.com' LIMIT 1), 'Disable add-ins, repair Office', NOW() - INTERVAL '18 hours'
UNION ALL SELECT 'Scanner not detected', 'Network scanner not showing in print queue', (SELECT id FROM categories WHERE name = 'Hardware Issues' LIMIT 1), 'hardware'::ticket_type, 'P3'::ticket_priority, 'assigned'::ticket_status, (SELECT id FROM user_ids WHERE email = 'emily.johnson@example.com' LIMIT 1), 'Reinstall scanner drivers, check IP', NOW() - INTERVAL '12 hours'
UNION ALL SELECT 'VPN split tunneling issues', 'Some traffic not routing through VPN', (SELECT id FROM categories WHERE name = 'Network & Connectivity' LIMIT 1), 'software'::ticket_type, 'P3'::ticket_priority, 'assigned'::ticket_status, (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1), 'Check VPN routing config', NOW() - INTERVAL '6 hours'

-- In Progress (15)
UNION ALL SELECT 'Display driver causing BSOD', 'Blue screen crash on GPU stress test', (SELECT id FROM categories WHERE name = 'Hardware Issues' LIMIT 1), 'bug'::ticket_type, 'P1'::ticket_priority, 'in_progress'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Load GPU stress test, observe crash', NOW() - INTERVAL '9 days'
UNION ALL SELECT 'Slow database queries', 'Query taking 30+ seconds to complete', (SELECT id FROM categories WHERE name = 'Performance' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'in_progress'::ticket_status, (SELECT id FROM user_ids WHERE email = 'michael.brown@example.com' LIMIT 1), 'Run query analyzer, check execution plan', NOW() - INTERVAL '7 days'
UNION ALL SELECT 'Mail server quota exceeded', 'Mailbox at 99% capacity', (SELECT id FROM categories WHERE name = 'Data & Storage' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'in_progress'::ticket_status, (SELECT id FROM user_ids WHERE email = 'emily.johnson@example.com' LIMIT 1), 'Archive old emails, cleanup', NOW() - INTERVAL '5 days'
UNION ALL SELECT 'API integration failing', 'Third-party API returning 502 errors', (SELECT id FROM categories WHERE name = 'Integration Issues' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'in_progress'::ticket_status, (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1), 'Check API status, review logs', NOW() - INTERVAL '3 days'
UNION ALL SELECT 'Memory leak in service', 'RAM usage increasing daily until crash', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'bug'::ticket_type, 'P1'::ticket_priority, 'in_progress'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Monitor RAM over time, check service logs', NOW() - INTERVAL '2 days'
UNION ALL SELECT 'Firewall rule blocking legitimate traffic', 'Business app traffic being blocked', (SELECT id FROM categories WHERE name = 'Network & Connectivity' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'in_progress'::ticket_status, (SELECT id FROM user_ids WHERE email = 'michael.brown@example.com' LIMIT 1), 'Review firewall logs, add exception', NOW() - INTERVAL '2 days'
UNION ALL SELECT 'Certificate expiration warning', 'SSL cert expires in 7 days', (SELECT id FROM categories WHERE name = 'Account & Access' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'in_progress'::ticket_status, (SELECT id FROM user_ids WHERE email = 'emily.johnson@example.com' LIMIT 1), 'Request new cert, deploy before expiry', NOW() - INTERVAL '1 day'
UNION ALL SELECT 'Report generation timeout', 'Monthly report fails every time', (SELECT id FROM categories WHERE name = 'Performance' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'in_progress'::ticket_status, (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1), 'Profile query, optimize data fetch', NOW() - INTERVAL '1 day'
UNION ALL SELECT 'Active Directory sync failing', 'User accounts not syncing from AD', (SELECT id FROM categories WHERE name = 'Integration Issues' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'in_progress'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Check sync service, review event logs', NOW() - INTERVAL '18 hours'
UNION ALL SELECT 'Batch job runtime increase', 'Nightly job now takes 3x longer', (SELECT id FROM categories WHERE name = 'Performance' LIMIT 1), 'software'::ticket_type, 'P3'::ticket_priority, 'in_progress'::ticket_status, (SELECT id FROM user_ids WHERE email = 'michael.brown@example.com' LIMIT 1), 'Profile job execution, check data volume', NOW() - INTERVAL '12 hours'
UNION ALL SELECT 'Plugin compatibility issue', 'Plugin crashing with latest software version', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'bug'::ticket_type, 'P2'::ticket_priority, 'in_progress'::ticket_status, (SELECT id FROM user_ids WHERE email = 'emily.johnson@example.com' LIMIT 1), 'Update plugin, test with new version', NOW() - INTERVAL '10 hours'
UNION ALL SELECT 'Cache invalidation bug', 'Stale data served from cache', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'bug'::ticket_type, 'P2'::ticket_priority, 'in_progress'::ticket_status, (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1), 'Verify cache TTL, clear cache manually', NOW() - INTERVAL '8 hours'
UNION ALL SELECT 'Load balancer misconfigured', 'Traffic not balanced evenly', (SELECT id FROM categories WHERE name = 'Network & Connectivity' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'in_progress'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Review load balancer config, test', NOW() - INTERVAL '6 hours'
UNION ALL SELECT 'Encryption key rotation overdue', 'Keys not rotated in 2 years', (SELECT id FROM categories WHERE name = 'Account & Access' LIMIT 1), 'software'::ticket_type, 'P1'::ticket_priority, 'in_progress'::ticket_status, (SELECT id FROM user_ids WHERE email = 'michael.brown@example.com' LIMIT 1), 'Generate new keys, rotate securely', NOW() - INTERVAL '4 hours'
UNION ALL SELECT 'Session storage corruption', 'User sessions randomly expiring', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'bug'::ticket_type, 'P2'::ticket_priority, 'in_progress'::ticket_status, (SELECT id FROM user_ids WHERE email = 'emily.johnson@example.com' LIMIT 1), 'Check session store, verify data integrity', NOW() - INTERVAL '2 hours'

-- Resolved (5)
UNION ALL SELECT 'PDF printing blank pages', 'Printing PDF shows blank instead of content', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'bug'::ticket_type, 'P2'::ticket_priority, 'resolved'::ticket_status, (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1), 'Print to PDF, verify output', NOW() - INTERVAL '14 days'
UNION ALL SELECT 'Password policy too strict', 'Can''t create valid password meeting requirements', (SELECT id FROM categories WHERE name = 'Account & Access' LIMIT 1), 'software'::ticket_type, 'P3'::ticket_priority, 'resolved'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Review policy, create valid password', NOW() - INTERVAL '10 days'
UNION ALL SELECT 'Export to Excel broken', 'Export function produces corrupted file', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'bug'::ticket_type, 'P2'::ticket_priority, 'resolved'::ticket_status, (SELECT id FROM user_ids WHERE email = 'michael.brown@example.com' LIMIT 1), 'Click export button, verify file integrity', NOW() - INTERVAL '8 days'
UNION ALL SELECT 'Login redirect loop', 'After login, redirect to login page again', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'bug'::ticket_type, 'P2'::ticket_priority, 'resolved'::ticket_status, (SELECT id FROM user_ids WHERE email = 'emily.johnson@example.com' LIMIT 1), 'Clear cookies, login again', NOW() - INTERVAL '6 days'
UNION ALL SELECT 'Report permissions incorrect', 'User seeing reports they shouldn''t access', (SELECT id FROM categories WHERE name = 'Account & Access' LIMIT 1), 'software'::ticket_type, 'P2'::ticket_priority, 'resolved'::ticket_status, (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1), 'Review role permissions, audit access', NOW() - INTERVAL '3 days'

-- Closed (5)
UNION ALL SELECT 'Old printer decommissioned', 'Printer moved to storage, no longer needed', (SELECT id FROM categories WHERE name = 'Hardware Issues' LIMIT 1), 'hardware'::ticket_type, 'P4'::ticket_priority, 'closed'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Remove from network, archive settings', NOW() - INTERVAL '12 days'
UNION ALL SELECT 'User transferred - clear desk', 'Employee left company, desk cleaned up', (SELECT id FROM categories WHERE name = 'General Support' LIMIT 1), 'hardware'::ticket_type, 'P3'::ticket_priority, 'closed'::ticket_status, (SELECT id FROM user_ids WHERE email = 'michael.brown@example.com' LIMIT 1), 'Verify all equipment removed', NOW() - INTERVAL '8 days'
UNION ALL SELECT 'Legacy software end of life', 'End of support reached, no longer used', (SELECT id FROM categories WHERE name = 'Software Issues' LIMIT 1), 'software'::ticket_type, 'P4'::ticket_priority, 'closed'::ticket_status, (SELECT id FROM user_ids WHERE email = 'emily.johnson@example.com' LIMIT 1), 'Archive docs, remove license', NOW() - INTERVAL '5 days'
UNION ALL SELECT 'Duplicate account cleanup', 'Merged duplicate user accounts', (SELECT id FROM categories WHERE name = 'Account & Access' LIMIT 1), 'software'::ticket_type, 'P3'::ticket_priority, 'closed'::ticket_status, (SELECT id FROM user_ids WHERE email = 'john.doe@example.com' LIMIT 1), 'Verify merge, delete duplicate', NOW() - INTERVAL '4 days'
UNION ALL SELECT 'Deprecated API endpoint', 'Old API version no longer supported', (SELECT id FROM categories WHERE name = 'Integration Issues' LIMIT 1), 'software'::ticket_type, 'P3'::ticket_priority, 'closed'::ticket_status, (SELECT id FROM user_ids WHERE email = 'sarah.smith@example.com' LIMIT 1), 'Migrate to new API, deprecate old', NOW() - INTERVAL '2 days';

-- Ticket Assignments (assign tickets to admins, round-robin)
-- Assigned tickets: admin distributes to themselves
WITH assigned_tickets AS (
  SELECT id FROM tickets WHERE status IN ('assigned'::ticket_status, 'in_progress'::ticket_status, 'resolved'::ticket_status, 'closed') ORDER BY created_at LIMIT 40
),
admin_users_with_rn AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY email) as rn FROM users WHERE role = 'admin'
),
super_admin AS (
  SELECT id FROM users WHERE role = 'super_admin' LIMIT 1
),
assigned_tickets_with_rn AS (
  SELECT at.id, ROW_NUMBER() OVER (ORDER BY at.id) as rn
  FROM assigned_tickets at
)
INSERT INTO ticket_assignment (ticket_id, assigned_to, assigned_by, is_active, assigned_at)
SELECT
  at.id,
  au.id,
  (SELECT id FROM super_admin),
  CASE WHEN t.status IN ('resolved'::ticket_status, 'closed') THEN FALSE ELSE TRUE END,
  at_rn.created_at + INTERVAL '1 hour'
FROM assigned_tickets_with_rn at_rn
JOIN tickets t ON t.id = at_rn.id
JOIN admin_users_with_rn au ON au.rn = (at_rn.rn % 5) + 1;

-- Satisfaction Ratings (only for resolved and closed tickets, 5 users rate them)
WITH resolved_closed AS (
  SELECT id, submitted_by FROM tickets WHERE status IN ('resolved'::ticket_status, 'closed')
),
user_raters AS (
  SELECT id FROM users WHERE role = 'user'
)
INSERT INTO satisfaction_ratings (ticket_id, rated_by, rating, comment)
SELECT
  rc.id,
  ur.id,
  (CASE (ROW_NUMBER() OVER (ORDER BY rc.id))::int % 5
    WHEN 1 THEN 5
    WHEN 2 THEN 4
    WHEN 3 THEN 5
    WHEN 4 THEN 3
    ELSE 4
  END),
  (CASE (ROW_NUMBER() OVER (ORDER BY rc.id))::int % 5
    WHEN 1 THEN 'Excellent support, issue resolved quickly!'
    WHEN 2 THEN 'Good help, could have been faster'
    WHEN 3 THEN 'Very satisfied with resolution'
    WHEN 4 THEN 'Issue fixed but took some time'
    ELSE 'Great support team!'
  END)
FROM resolved_closed rc
CROSS JOIN (SELECT * FROM user_raters LIMIT 1) ur;
```