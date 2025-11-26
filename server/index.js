const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const ldap = require('ldapjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Simple password hashing
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Mock AD Configuration (Replace with real env vars)
const AD_URL = process.env.AD_URL || 'ldap://central.local';
const AD_DN = process.env.AD_DN || 'dc=central,dc=local';

// Gravity Forms API Configuration
const GF_API_URL = process.env.GF_API_URL; // e.g., https://yoursite.com/wp-json/gf/v2
const GF_CONSUMER_KEY = process.env.GF_CONSUMER_KEY;
const GF_CONSUMER_SECRET = process.env.GF_CONSUMER_SECRET;
const GF_FORM_ID = process.env.GF_FORM_ID || '4';

// WordPress REST API Configuration (for CreditInfo logs)
const WP_API_URL = process.env.WP_API_URL; // e.g., https://central.ge/wp-json/wp/v2
const WP_USER = process.env.WP_USER;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;

// Check CreditInfo verification status by Personal ID
async function checkCreditInfoVerification(personalId) {
  if (!WP_API_URL || !WP_USER || !WP_APP_PASSWORD || !personalId) {
    return false;
  }

  try {
    const auth = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');
    
    // Try different possible endpoints for the custom post type
    const possibleEndpoints = [
      `${WP_API_URL}/creditinfo_logs`,
      `${WP_API_URL}/creditinfo-logs`, 
      `${WP_API_URL}/creditinfo_log`,
      `${WP_API_URL}/creditinfologs`
    ];
    
    for (const endpoint of possibleEndpoints) {
      try {
        const response = await fetch(`${endpoint}?search=${personalId}&per_page=10`, {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const logs = await response.json();
          
          if (logs && logs.length > 0) {
            // Check if any log indicates successful verification
            for (const log of logs) {
              const content = log.content?.rendered || '';
              const title = log.title?.rendered || '';
              const acf = log.acf || {}; // ACF custom fields
              const meta = log.meta || {};
              
              // Check if this log matches our personal ID and is successful
              const matchesId = title.includes(personalId) || 
                               content.includes(personalId) ||
                               acf.personal_id === personalId ||
                               acf.customer_id === personalId ||
                               meta.personal_id === personalId;
                               
              if (matchesId) {
                // Check for success indicators in content, ACF fields, or meta
                const isSuccess = content.toLowerCase().includes('success') ||
                                 content.toLowerCase().includes('verified') ||
                                 content.includes('წარმატებით') ||
                                 acf.status === 'success' ||
                                 acf.verified === true ||
                                 acf.verification_status === 'success' ||
                                 meta.status === 'success';
                                 
                if (isSuccess) {
                  console.log(`CreditInfo verification found for ${personalId}`);
                  return true;
                }
              }
            }
          }
          break; // Found working endpoint, stop trying others
        }
      } catch (e) {
        // Continue to next endpoint
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking CreditInfo verification:', error.message);
    return false;
  }
}

// Gravity Forms API Helper// Gravity Forms API Helper
async function fetchGravityFormsEntries() {
  if (!GF_API_URL || !GF_CONSUMER_KEY || !GF_CONSUMER_SECRET) {
    console.log('Gravity Forms API not configured, skipping sync');
    return [];
  }

  try {
    const auth = Buffer.from(`${GF_CONSUMER_KEY}:${GF_CONSUMER_SECRET}`).toString('base64');
    const response = await fetch(`${GF_API_URL}/forms/${GF_FORM_ID}/entries?paging[page_size]=500`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`GF API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.entries || [];
  } catch (error) {
    console.error('Error fetching Gravity Forms entries:', error.message);
    return [];
  }
}

// Sync entries from Gravity Forms to database
async function syncGravityFormsEntries() {
  console.log(`[${new Date().toISOString()}] Starting Gravity Forms sync...`);
  
  const entries = await fetchGravityFormsEntries();
  
  if (entries.length === 0) {
    console.log('No entries to sync');
    return { synced: 0, errors: 0 };
  }

  let synced = 0;
  let errors = 0;

  for (const entry of entries) {
    try {
      // Map Gravity Forms fields to our model
      // Field mapping for central.ge Form 4:
      // 33 = First Name, 34 = Last Name, 35 = Email, 27 = Mobile
      // 21 = Branch, 14 = Amount, 16 = Loan Type, 31 = Personal ID
      // 37 = MyCredit Info Status (verification status from CreditInfo)
      
      // Check verification status from field 37
      const creditInfoStatus = entry['37'] || '';
      
      // Log the field value for first few entries to see what we're getting
      if (synced < 5 && creditInfoStatus) {
        console.log(`Entry ${entry.id} - CreditInfo Status (field 37): "${creditInfoStatus}"`);
      }
      
      const isVerified = creditInfoStatus.toLowerCase().includes('verified') || 
                         creditInfoStatus.toLowerCase().includes('success') ||
                         creditInfoStatus.toLowerCase().includes('წარმატებით') ||
                         creditInfoStatus === '1' ||
                         creditInfoStatus === 'true' ||
                         creditInfoStatus.length > 0; // If field has any value, consider verified
      
      const entryData = {
        wpEntryId: entry.id.toString(),
        firstName: entry['33'] || entry['first_name'] || 'Unknown',
        lastName: entry['34'] || entry['last_name'] || 'Unknown',
        email: entry['35'] || entry['email'] || '',
        mobile: entry['27'] || entry['phone'] || entry['mobile'] || '',
        branch: entry['21'] || entry['branch'] || 'Main',
        details: JSON.stringify(entry),
        verificationStatus: isVerified,
        createdAt: entry.date_created ? new Date(entry.date_created) : new Date()
      };

      await prisma.loanApplication.upsert({
        where: { wpEntryId: entryData.wpEntryId },
        update: {
          firstName: entryData.firstName,
          lastName: entryData.lastName,
          email: entryData.email,
          mobile: entryData.mobile,
          branch: entryData.branch,
          details: entryData.details,
          verificationStatus: isVerified
        },
        create: entryData
      });

      synced++;
    } catch (error) {
      console.error(`Error syncing entry ${entry.id}:`, error.message);
      errors++;
    }
  }

  console.log(`[${new Date().toISOString()}] Sync complete: ${synced} synced, ${errors} errors`);
  
  // Update last sync time in settings
  try {
    await prisma.settings.update({
      where: { id: 1 },
      data: { lastSyncTime: new Date() }
    });
  } catch (e) {
    console.log('Failed to update lastSyncTime:', e.message);
  }
  
  return { synced, errors };
}

// Dynamic sync interval management
let syncIntervalId = null;

async function startSyncScheduler() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const intervalMinutes = settings?.syncInterval || 5;
  const intervalMs = intervalMinutes * 60 * 1000;
  
  // Clear existing interval if any
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
  }
  
  console.log(`Sync scheduler started: every ${intervalMinutes} minutes`);
  syncIntervalId = setInterval(syncGravityFormsEntries, intervalMs);
}

// Run initial sync on startup (after a short delay to ensure DB is ready)
setTimeout(() => {
  syncGravityFormsEntries();
  startSyncScheduler();
}, 5000);

// Initialize default settings
async function ensureSettings() {
  try {
    await prisma.settings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        adServer: '',
        adPort: 389,
        adBaseDN: '',
        adDomain: '',
        adBindUser: '',
        adBindPassword: '',
        adGroupFilter: '',
        syncInterval: 5
      }
    });
    console.log('Settings initialized');
  } catch (e) {
    console.log('Settings init:', e.message);
  }
}
ensureSettings();

// LDAP Authentication function
async function authenticateWithAD(username, password) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  
  if (!settings || !settings.adServer) {
    console.log('AD not configured, using fallback auth');
    return { success: false, fallback: true };
  }

  // Clean username for sAMAccountName search (remove domain if present)
  const cleanUsername = username.includes('@') ? username.split('@')[0] : username;
  
  return new Promise((resolve) => {
    const client = ldap.createClient({
      url: `ldap://${settings.adServer}:${settings.adPort}`,
      timeout: 5000,
      connectTimeout: 5000
    });

    client.on('error', (err) => {
      console.error('LDAP connection error:', err.message);
      resolve({ success: false, error: 'კავშირი ვერ მოხერხდა' });
    });

    // Bind with the user's credentials
    // If username already contains @, use as-is; otherwise append domain
    const userDN = username.includes('@') ? username : (settings.adDomain ? `${username}@${settings.adDomain}` : username);
    console.log('Attempting LDAP bind with:', userDN);
    
    client.bind(userDN, password, (err) => {
      if (err) {
        console.log('LDAP bind failed:', err.message, '- Error code:', err.code);
        client.unbind();
        resolve({ success: false, error: 'არასწორი პაროლი ან მომხმარებელი' });
        return;
      }

      console.log('LDAP bind successful for:', cleanUsername);
      
      // If group filter is set, check membership
      if (settings.adGroupFilter && settings.adBaseDN) {
        // First, find the user and get their memberOf attribute
        const searchFilter = `(sAMAccountName=${cleanUsername})`;
        console.log('Searching for user:', searchFilter);
        
        client.search(settings.adBaseDN, {
          filter: searchFilter,
          scope: 'sub',
          attributes: ['dn', 'sAMAccountName', 'displayName', 'mail', 'memberOf']
        }, (searchErr, searchRes) => {
          if (searchErr) {
            console.log('Search error:', searchErr.message);
            client.unbind();
            resolve({ success: false, error: 'Search failed' });
            return;
          }

          let found = false;
          let userInfo = {};
          let userGroups = [];

          searchRes.on('searchEntry', (entry) => {
            found = true;
            userInfo = {
              dn: entry.objectName,
              displayName: entry.attributes.find(a => a.type === 'displayName')?.values[0],
              mail: entry.attributes.find(a => a.type === 'mail')?.values[0]
            };
            // Get all groups the user is a member of
            const memberOfAttr = entry.attributes.find(a => a.type === 'memberOf');
            userGroups = memberOfAttr?.values || [];
            console.log('User groups:', userGroups);
          });

          searchRes.on('end', () => {
            client.unbind();
            if (found) {
              // Check if user is in the required group (case-insensitive comparison)
              const requiredGroup = settings.adGroupFilter.toLowerCase();
              const isInGroup = userGroups.some(g => g.toLowerCase() === requiredGroup || g.toLowerCase().includes(requiredGroup.split(',')[0].toLowerCase()));
              
              if (isInGroup) {
                console.log('User found in required group');
                resolve({ success: true, userInfo });
              } else {
                console.log('User NOT in required group. Required:', settings.adGroupFilter);
                console.log('User has groups:', userGroups.length > 0 ? userGroups : 'none');
                resolve({ success: false, error: 'მომხმარებელი არ არის საჭირო ჯგუფში' });
              }
            } else {
              console.log('User not found in AD search');
              resolve({ success: false, error: 'მომხმარებელი ვერ მოიძებნა' });
            }
          });

          searchRes.on('error', (err) => {
            console.log('Search result error:', err.message);
            client.unbind();
            resolve({ success: false, error: 'Search error' });
          });
        });
      } else {
        // No group check needed
        console.log('No group filter - login allowed');
        client.unbind();
        resolve({ success: true });
      }
    });
  });
}

// Login Route (AD Auth with auto-registration)
app.post('/api/login', async (req, res) => {
  const { username, password, authMode = 'domain' } = req.body;
  console.log('Login attempt for:', username, 'mode:', authMode);
  
  // Clean username (remove domain if provided) for database lookup
  const cleanUsername = username.includes('@') ? username.split('@')[0] : username;
  console.log('Clean username:', cleanUsername);
  
  // LOCAL AUTH MODE
  if (authMode === 'local') {
    const user = await prisma.user.findUnique({ where: { username: cleanUsername } });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'მომხმარებელი არ არის რეგისტრირებული' });
    }
    
    // Check local password
    if (user.password) {
      const hashedInput = hashPassword(password);
      if (hashedInput === user.password) {
        return res.json({ success: true, user });
      }
    }
    // Default password for testing
    if (password === 'password') {
      return res.json({ success: true, user });
    }
    
    return res.status(401).json({ success: false, message: 'არასწორი პაროლი' });
  }
  
  // DOMAIN (AD) AUTH MODE
  console.log('Domain auth mode - trying AD authentication');
  const adResult = await authenticateWithAD(username, password);
  console.log('AD auth result:', JSON.stringify(adResult));
  
  if (!adResult.success) {
    // If AD not configured, suggest local auth
    if (adResult.fallback) {
      return res.status(401).json({ success: false, message: 'AD არ არის კონფიგურირებული. გამოიყენეთ ლოკალური ავთენტიფიკაცია.' });
    }
    return res.status(401).json({ success: false, message: adResult.error || 'არასწორი მონაცემები' });
  }
  
  // AD auth successful - check if user exists or create them
  let user = await prisma.user.findUnique({ where: { username: cleanUsername } });
  
  if (!user) {
    // Auto-register user from AD with default role 'officer'
    console.log('Auto-registering AD user:', cleanUsername);
    user = await prisma.user.create({
      data: {
        username: cleanUsername,
        role: 'officer',
        branches: '' // Will need to be set by admin later
      }
    });
    console.log('User auto-registered:', user.username);
  }
  
  console.log('AD login successful for:', user.username);
  return res.json({ success: true, user });
});

// Change password (Admin only)
app.post('/api/users/:id/change-password', async (req, res) => {
  const { id } = req.params;
  const { newPassword, adminId } = req.body;
  
  try {
    // Check if requester is admin
    const admin = await prisma.user.findUnique({ where: { id: parseInt(adminId) } });
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'მხოლოდ ადმინისტრატორს შეუძლია პაროლის შეცვლა' });
    }
    
    const hashedPassword = hashPassword(newPassword);
    
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { password: hashedPassword }
    });
    
    res.json({ success: true, message: 'პაროლი წარმატებით შეიცვალა' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get Settings (Admin only)
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    // Don't send the password
    if (settings) {
      settings.adBindPassword = settings.adBindPassword ? '********' : '';
    }
    res.json(settings || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get public settings (logo, favicon) - no auth required
app.get('/api/settings/public', async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    res.json({
      logoUrl: settings?.logoUrl || '',
      faviconUrl: settings?.faviconUrl || ''
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update Settings (Admin only)
app.post('/api/settings', async (req, res) => {
  const { adServer, adPort, adBaseDN, adDomain, adBindUser, adBindPassword, adGroupFilter, syncInterval } = req.body;
  
  try {
    // Get current settings
    const current = await prisma.settings.findUnique({ where: { id: 1 } });
    const oldSyncInterval = current?.syncInterval || 5;
    const newSyncInterval = parseInt(syncInterval) || 5;
    
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        adServer: adServer || '',
        adPort: parseInt(adPort) || 389,
        adBaseDN: adBaseDN || '',
        adDomain: adDomain || '',
        adBindUser: adBindUser || '',
        // Only update password if it's not the masked value
        adBindPassword: adBindPassword === '********' ? current?.adBindPassword || '' : adBindPassword || '',
        adGroupFilter: adGroupFilter || '',
        syncInterval: newSyncInterval
      },
      create: {
        id: 1,
        adServer: adServer || '',
        adPort: parseInt(adPort) || 389,
        adBaseDN: adBaseDN || '',
        adDomain: adDomain || '',
        adBindUser: adBindUser || '',
        adBindPassword: adBindPassword || '',
        adGroupFilter: adGroupFilter || '',
        syncInterval: newSyncInterval
      }
    });
    
    // Restart sync scheduler if interval changed
    if (oldSyncInterval !== newSyncInterval) {
      startSyncScheduler();
    }
    
    res.json({ success: true, message: 'Settings saved' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upload logo
app.post('/api/settings/upload-logo', async (req, res) => {
  try {
    const { image } = req.body; // base64 encoded image
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    // Parse base64
    const matches = image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format' });
    }
    
    const ext = matches[1] === 'svg+xml' ? 'svg' : matches[1];
    const data = matches[2];
    const filename = `logo.${ext}`;
    const filepath = path.join(__dirname, 'uploads', filename);
    
    // Save file
    fs.writeFileSync(filepath, Buffer.from(data, 'base64'));
    
    // Update settings
    const logoUrl = `/uploads/${filename}?t=${Date.now()}`;
    await prisma.settings.upsert({
      where: { id: 1 },
      update: { logoUrl },
      create: { id: 1, logoUrl }
    });
    
    res.json({ success: true, logoUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upload favicon
app.post('/api/settings/upload-favicon', async (req, res) => {
  try {
    const { image } = req.body; // base64 encoded image
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    // Parse base64
    const matches = image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format' });
    }
    
    const ext = matches[1] === 'svg+xml' ? 'svg' : (matches[1] === 'x-icon' ? 'ico' : matches[1]);
    const data = matches[2];
    const filename = `favicon.${ext}`;
    const filepath = path.join(__dirname, 'uploads', filename);
    
    // Save file
    fs.writeFileSync(filepath, Buffer.from(data, 'base64'));
    
    // Update settings
    const faviconUrl = `/uploads/${filename}?t=${Date.now()}`;
    await prisma.settings.upsert({
      where: { id: 1 },
      update: { faviconUrl },
      create: { id: 1, faviconUrl }
    });
    
    res.json({ success: true, faviconUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Test AD Connection
app.post('/api/settings/test-ad', async (req, res) => {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  
  if (!settings || !settings.adServer) {
    return res.status(400).json({ success: false, error: 'AD not configured' });
  }

  const client = ldap.createClient({
    url: `ldap://${settings.adServer}:${settings.adPort}`,
    timeout: 5000,
    connectTimeout: 5000
  });

  client.on('error', (err) => {
    res.status(400).json({ success: false, error: `Connection failed: ${err.message}` });
  });

  const bindUser = settings.adBindUser ? 
    (settings.adDomain ? `${settings.adBindUser}@${settings.adDomain}` : settings.adBindUser) : 
    null;

  if (bindUser && settings.adBindPassword) {
    client.bind(bindUser, settings.adBindPassword, (err) => {
      client.unbind();
      if (err) {
        res.json({ success: false, error: `Bind failed: ${err.message}` });
      } else {
        res.json({ success: true, message: 'კავშირი წარმატებით დამყარდა!' });
      }
    });
  } else {
    // Just test connection without bind
    client.bind('', '', (err) => {
      client.unbind();
      // Anonymous bind might fail but connection is ok
      res.json({ success: true, message: 'სერვერთან კავშირი წარმატებით დამყარდა' });
    });
  }
});

// Get Users (Admin only)
app.get('/api/users', async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(users);
});

// Verify user exists in AD
app.post('/api/users/verify-ad', async (req, res) => {
  const { username } = req.body;
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  
  if (!settings || !settings.adServer || !settings.adBindUser || !settings.adBindPassword) {
    return res.json({ success: false, message: 'AD არ არის კონფიგურირებული ან Bind credentials არ არის მითითებული' });
  }

  try {
    const client = ldap.createClient({
      url: `ldap://${settings.adServer}:${settings.adPort}`,
      timeout: 5000,
      connectTimeout: 5000
    });

    // Bind with service account
    const bindDN = settings.adBindUser.includes('@') ? settings.adBindUser : `${settings.adBindUser}@${settings.adDomain}`;
    
    client.bind(bindDN, settings.adBindPassword, (bindErr) => {
      if (bindErr) {
        console.log('AD bind failed:', bindErr.message);
        client.unbind();
        return res.json({ success: false, message: 'AD კავშირი ვერ მოხერხდა' });
      }

      // Search for user
      const searchUsername = username.includes('@') ? username.split('@')[0] : username;
      const searchFilter = `(sAMAccountName=${searchUsername})`;
      
      client.search(settings.adBaseDN, {
        filter: searchFilter,
        scope: 'sub',
        attributes: ['sAMAccountName', 'displayName', 'mail', 'userPrincipalName']
      }, (searchErr, searchRes) => {
        if (searchErr) {
          client.unbind();
          return res.json({ success: false, message: 'ძებნის შეცდომა' });
        }

        let found = false;
        let userInfo = {};

        searchRes.on('searchEntry', (entry) => {
          found = true;
          userInfo = {
            sAMAccountName: entry.attributes.find(a => a.type === 'sAMAccountName')?.values[0],
            displayName: entry.attributes.find(a => a.type === 'displayName')?.values[0],
            mail: entry.attributes.find(a => a.type === 'mail')?.values[0],
            userPrincipalName: entry.attributes.find(a => a.type === 'userPrincipalName')?.values[0]
          };
        });

        searchRes.on('end', () => {
          client.unbind();
          if (found) {
            res.json({ success: true, user: userInfo, message: 'მომხმარებელი ნაპოვნია AD-ში' });
          } else {
            res.json({ success: false, message: 'მომხმარებელი ვერ მოიძებნა AD-ში' });
          }
        });

        searchRes.on('error', () => {
          client.unbind();
          res.json({ success: false, message: 'ძებნის შეცდომა' });
        });
      });
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// Create/Update User (Admin)
app.post('/api/users', async (req, res) => {
  const { username, role, branches } = req.body;
  // Store username without domain for flexibility
  const cleanUsername = username.includes('@') ? username.split('@')[0] : username;
  const user = await prisma.user.upsert({
    where: { username: cleanUsername },
    update: { role, branches },
    create: { username: cleanUsername, role, branches }
  });
  res.json(user);
});

// Delete User (Admin)
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Create default admin user on startup
async function ensureAdminUser() {
  try {
    await prisma.user.upsert({
      where: { username: 'admin' },
      update: { role: 'admin', branches: 'All' },
      create: {
        username: 'admin',
        role: 'admin',
        branches: 'All'
      }
    });
    console.log('Admin user ensured');
  } catch (e) {
    console.log('Admin user setup:', e.message);
  }
}
ensureAdminUser();

// Get Loan Applications with pagination and search
app.get('/api/loans', async (req, res) => {
  const { userId, role, branches, page = 1, limit = 20, search = '', dateFrom, dateTo, verifiedOnly } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // If officer/manager has no branches assigned, return empty result
  if ((role === 'officer' || role === 'manager') && (!branches || branches.trim() === '')) {
    return res.json({
      loans: [],
      pagination: { page: 1, limit: parseInt(limit), total: 0, pages: 0 },
      noBranches: true
    });
  }
  
  let where = {};
  
  // Date range filter
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      // Set to end of day
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = endDate;
    }
  }
  
  // Verified filter
  if (verifiedOnly === 'true') {
    where.verificationStatus = true;
  }
  
  // Search filter
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { mobile: { contains: search } },
      { details: { contains: search } } // This will search in personal ID too
    ];
  }
  
  if (role === 'officer') {
    // Officers see: pending unassigned loans in their branch + their own assigned loans
    // Applications assigned to OTHER officers are hidden from this officer
    const userBranchList = branches ? branches.split(',') : [];
    where.AND = [
      search ? { OR: where.OR } : {},
      verifiedOnly === 'true' ? { verificationStatus: true } : {},
      {
        OR: [
          // Pending unassigned loans in their branch (available to take)
          { 
            status: 'pending',
            assignedToId: null,
            branch: { in: userBranchList }
          },
          // Their own assigned loans (pending or in_progress)
          { 
            assignedToId: parseInt(userId),
            status: { in: ['pending', 'in_progress'] }
          }
        ]
      }
    ];
    delete where.OR;
    // Remove verificationStatus from top-level where since it's in AND
    delete where.verificationStatus;
  } else if (role === 'manager') {
    // Filter by branch (unless manager has access to all branches)
    const userBranches = branches ? branches.split(',') : [];
    const hasAllBranches = userBranches.some(b => b === '*' || b.toLowerCase() === 'all');
    if (!hasAllBranches) {
      where.branch = { in: userBranches };
    }
  } else if (role === 'manager_viewer') {
    // manager_viewer sees all applications (like admin) but read-only
    // No branch filtering - sees everything
  }
  // Admin sees all
  
  const [loans, total] = await Promise.all([
    prisma.loanApplication.findMany({
      where,
      include: { 
        assignedTo: true,
        assignmentRequests: {
          where: { status: 'pending' },
          include: { requestedBy: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.loanApplication.count({ where })
  ]);
  
  res.json({
    loans,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// Secure loan search (privacy-protected)
app.get('/api/loans/search-secure', async (req, res) => {
  const { mobile, idLast4 } = req.query;
  
  if (!mobile || !idLast4 || idLast4.length !== 4) {
    return res.status(400).json({ error: 'მობილური და პირადი ნომრის ბოლო 4 ციფრი სავალდებულოა' });
  }
  
  try {
    // Find loans that match the mobile number
    const loans = await prisma.loanApplication.findMany({
      where: {
        mobile: { contains: mobile }
      },
      include: {
        assignedTo: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Filter by last 4 digits of personal ID (field 31 in details)
    const matchedLoan = loans.find(loan => {
      try {
        const details = JSON.parse(loan.details || '{}');
        const personalId = details['31'] || '';
        return personalId.endsWith(idLast4);
      } catch {
        return false;
      }
    });
    
    if (!matchedLoan) {
      return res.json({ found: false });
    }
    
    // Parse details for product and amount
    let product = 'N/A';
    let amount = 'N/A';
    try {
      const details = JSON.parse(matchedLoan.details || '{}');
      product = details['16'] || 'N/A'; // Product type field
      amount = details['14'] || 'N/A'; // Amount field
    } catch {}
    
    // Return privacy-protected result
    res.json({
      found: true,
      loan: {
        id: matchedLoan.id,
        product,
        amount,
        branch: matchedLoan.branch,
        expert: matchedLoan.assignedTo?.username || null,
        assignedToId: matchedLoan.assignedToId,
        status: matchedLoan.status
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Assign Loan (direct assignment by manager/admin)
app.post('/api/loans/:id/assign', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  
  const loan = await prisma.loanApplication.update({
    where: { id: parseInt(id) },
    data: { 
      assignedToId: parseInt(userId),
      status: 'in_progress'
    }
  });
  res.json(loan);
});

// Reassign loan (admin only - change branch and/or officer)
app.post('/api/loans/:id/reassign', async (req, res) => {
  const { id } = req.params;
  const { branch, officerId } = req.body;
  
  try {
    const updateData = {};
    
    if (branch) {
      updateData.branch = branch;
    }
    
    // officerId can be a number (assign) or explicitly null/undefined (unassign)
    if (officerId !== undefined) {
      if (officerId) {
        updateData.assignedToId = parseInt(officerId);
        updateData.status = 'in_progress';
      } else {
        // Unassign - set to null and reset status to pending
        updateData.assignedToId = null;
        updateData.status = 'pending';
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'არცერთი ცვლილება არ მოთხოვნილა' });
    }
    
    const loan = await prisma.loanApplication.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { assignedTo: true }
    });
    
    res.json(loan);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Self-assign loan (officer takes their branch application)
app.post('/api/loans/:id/take', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  
  try {
    // Get the officer's info
    const officer = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!officer) {
      return res.status(404).json({ error: 'მომხმარებელი ვერ მოიძებნა' });
    }
    
    // Get the loan
    const loan = await prisma.loanApplication.findUnique({ where: { id: parseInt(id) } });
    if (!loan) {
      return res.status(404).json({ error: 'განაცხადი ვერ მოიძებნა' });
    }
    
    // Check if loan is already assigned
    if (loan.assignedToId) {
      return res.status(400).json({ error: 'განაცხადი უკვე მინიჭებულია' });
    }
    
    // Check if officer's branch matches loan branch
    const officerBranches = officer.branches ? officer.branches.split(',').map(b => b.trim().toLowerCase()) : [];
    const loanBranch = loan.branch?.toLowerCase() || '';
    
    const branchMatch = officerBranches.some(b => 
      b === 'all' || loanBranch.includes(b) || b.includes(loanBranch.split(' ')[0])
    );
    
    if (!branchMatch && officerBranches.length > 0) {
      return res.status(403).json({ error: 'თქვენ ვერ აიღებთ სხვა ფილიალის განაცხადს' });
    }
    
    // Assign the loan to the officer
    const updatedLoan = await prisma.loanApplication.update({
      where: { id: parseInt(id) },
      data: { 
        assignedToId: parseInt(userId),
        status: 'in_progress'
      }
    });
    
    res.json({ success: true, loan: updatedLoan });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Request to take a loan (by officer) - DEPRECATED, kept for backward compatibility
app.post('/api/loans/:id/request', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  
  try {
    // Check if there's already a pending request from this user
    const existingRequest = await prisma.assignmentRequest.findFirst({
      where: {
        loanId: parseInt(id),
        requestedById: parseInt(userId),
        status: 'pending'
      }
    });
    
    if (existingRequest) {
      return res.status(400).json({ error: 'თქვენ უკვე გაქვთ მოთხოვნა გაგზავნილი' });
    }
    
    const request = await prisma.assignmentRequest.create({
      data: {
        loanId: parseInt(id),
        requestedById: parseInt(userId)
      },
      include: { requestedBy: true, loan: true }
    });
    
    res.json(request);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get pending assignment requests (for manager/admin)
app.get('/api/assignment-requests', async (req, res) => {
  const { branches } = req.query;
  
  let where = { status: 'pending' };
  
  if (branches && branches !== 'All') {
    const branchList = branches.split(',');
    where.loan = { branch: { in: branchList } };
  }
  
  const requests = await prisma.assignmentRequest.findMany({
    where,
    include: {
      loan: true,
      requestedBy: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  res.json(requests);
});

// Handle assignment request (approve/reject by manager/admin)
app.post('/api/assignment-requests/:id/handle', async (req, res) => {
  const { id } = req.params;
  const { action, handledById } = req.body; // action: 'approve' or 'reject'
  
  try {
    const request = await prisma.assignmentRequest.findUnique({
      where: { id: parseInt(id) },
      include: { loan: true }
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    if (action === 'approve') {
      // Assign the loan to the requesting officer
      await prisma.$transaction([
        prisma.loanApplication.update({
          where: { id: request.loanId },
          data: { 
            assignedToId: request.requestedById,
            status: 'in_progress'
          }
        }),
        prisma.assignmentRequest.update({
          where: { id: parseInt(id) },
          data: { 
            status: 'approved',
            handledById: parseInt(handledById),
            handledAt: new Date()
          }
        }),
        // Reject other pending requests for the same loan
        prisma.assignmentRequest.updateMany({
          where: {
            loanId: request.loanId,
            id: { not: parseInt(id) },
            status: 'pending'
          },
          data: { 
            status: 'rejected',
            handledById: parseInt(handledById),
            handledAt: new Date()
          }
        })
      ]);
    } else {
      await prisma.assignmentRequest.update({
        where: { id: parseInt(id) },
        data: { 
          status: 'rejected',
          handledById: parseInt(handledById),
          handledAt: new Date()
        }
      });
    }
    
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Close/Update Loan Status (approve/reject/cancel)
app.post('/api/loans/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, userId, cancellationReason } = req.body; // status: 'approved', 'rejected', or 'cancelled'
  
  // Validate status
  const validStatuses = ['approved', 'rejected', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  try {
    const updateData = { 
      status,
      closedAt: new Date(),
      closedById: parseInt(userId)
    };
    
    // Add cancellation reason if provided
    if (status === 'cancelled' && cancellationReason) {
      updateData.cancellationReason = cancellationReason;
    }
    
    const loan = await prisma.loanApplication.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    res.json(loan);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Refresh CreditInfo verification status for a loan
app.post('/api/loans/:id/verify', async (req, res) => {
  const { id } = req.params;
  
  try {
    const loan = await prisma.loanApplication.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    
    // Get personal ID from details
    const details = JSON.parse(loan.details || '{}');
    const personalId = details['31'] || '';
    
    if (!personalId) {
      return res.json({ success: false, message: 'პირადი ნომერი არ არის მითითებული' });
    }
    
    const isVerified = await checkCreditInfoVerification(personalId);
    
    if (isVerified !== loan.verificationStatus) {
      await prisma.loanApplication.update({
        where: { id: parseInt(id) },
        data: { verificationStatus: isVerified }
      });
    }
    
    res.json({ 
      success: true, 
      verified: isVerified,
      message: isVerified ? 'CreditInfo ვერიფიკაცია წარმატებულია' : 'ვერიფიკაცია ვერ მოიძებნა'
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get Loan Statistics
app.get('/api/loans/stats', async (req, res) => {
  const { role, branches } = req.query;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Build branch filter for non-admins
  let branchFilter = {};
  if (role && role !== 'admin' && branches) {
    const userBranches = branches.split(',');
    // Check if user has access to all branches ("*" or "all")
    const hasAllBranches = userBranches.some(b => b === '*' || b.toLowerCase() === 'all');
    if (!hasAllBranches) {
      branchFilter = { branch: { in: userBranches } };
    }
  }
  
  const [todayCount, monthCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
    prisma.loanApplication.count({
      where: { createdAt: { gte: startOfDay }, ...branchFilter }
    }),
    prisma.loanApplication.count({
      where: { createdAt: { gte: startOfMonth }, ...branchFilter }
    }),
    prisma.loanApplication.count({
      where: { status: 'pending', ...branchFilter }
    }),
    prisma.loanApplication.count({
      where: { status: 'approved', ...branchFilter }
    }),
    prisma.loanApplication.count({
      where: { status: 'rejected', ...branchFilter }
    })
  ]);
  
  res.json({
    today: todayCount,
    month: monthCount,
    pending: pendingCount,
    approved: approvedCount,
    rejected: rejectedCount
  });
});

// Reports Dashboard API
app.get('/api/reports/dashboard', async (req, res) => {
  const { branch } = req.query;
  const now = new Date();
  
  // Date calculations
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  
  // Branch filter
  let branchFilter = {};
  if (branch && branch !== 'all') {
    branchFilter = { branch };
  }
  
  try {
    // Basic counts
    const [today, thisMonth, lastMonth, thisYear] = await Promise.all([
      prisma.loanApplication.count({
        where: { createdAt: { gte: startOfDay }, ...branchFilter }
      }),
      prisma.loanApplication.count({
        where: { createdAt: { gte: startOfMonth }, ...branchFilter }
      }),
      prisma.loanApplication.count({
        where: { 
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          ...branchFilter 
        }
      }),
      prisma.loanApplication.count({
        where: { createdAt: { gte: startOfYear }, ...branchFilter }
      })
    ]);
    
    // Monthly trend percentage
    const monthlyTrend = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : (thisMonth > 0 ? 100 : 0);
    
    // Status distribution
    const statusCounts = await prisma.loanApplication.groupBy({
      by: ['status'],
      _count: { status: true },
      where: { createdAt: { gte: startOfYear }, ...branchFilter }
    });
    
    const statusLabels = {
      pending: 'მოლოდინში',
      in_progress: 'მუშავდება',
      approved: 'დამტკიცებული',
      rejected: 'უარყოფილი',
      cancelled: 'გაუქმებული'
    };
    
    const statusDistribution = statusCounts.map(s => ({
      status: statusLabels[s.status] || s.status,
      statusKey: s.status,
      count: s._count.status
    }));
    
    // Branch distribution (only if viewing all branches)
    let branchDistribution = [];
    if (!branch || branch === 'all') {
      const branchCounts = await prisma.loanApplication.groupBy({
        by: ['branch'],
        _count: { branch: true },
        where: { createdAt: { gte: startOfYear } },
        orderBy: { _count: { branch: 'desc' } }
      });
      branchDistribution = branchCounts.map(b => ({
        branch: b.branch,
        count: b._count.branch
      }));
    }
    
    // Product distribution (from details JSON field '16')
    const allLoans = await prisma.loanApplication.findMany({
      where: { createdAt: { gte: startOfYear }, ...branchFilter },
      select: { details: true }
    });
    
    const productCounts = {};
    allLoans.forEach(loan => {
      try {
        const details = JSON.parse(loan.details || '{}');
        const product = details['16'] || 'სხვა';
        productCounts[product] = (productCounts[product] || 0) + 1;
      } catch (e) {
        productCounts['სხვა'] = (productCounts['სხვა'] || 0) + 1;
      }
    });
    
    const productDistribution = Object.entries(productCounts)
      .map(([product, count]) => ({ product, count }))
      .sort((a, b) => b.count - a.count);
    
    const mostRequestedProduct = productDistribution[0] || null;
    
    // Monthly data for trend chart (last 12 months)
    const monthlyData = [];
    const monthNames = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];
    
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      
      const count = await prisma.loanApplication.count({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
          ...branchFilter
        }
      });
      
      monthlyData.push({
        month: monthNames[monthStart.getMonth()],
        count
      });
    }
    
    res.json({
      today,
      thisMonth,
      lastMonth,
      thisYear,
      monthlyTrend,
      statusDistribution,
      branchDistribution,
      productDistribution,
      mostRequestedProduct,
      monthlyData
    });
  } catch (e) {
    console.error('Reports error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Webhook for WordPress (Gravity Forms) - Real-time updates
app.post('/api/webhook/gravity-forms', async (req, res) => {
  const data = req.body;
  // Map GF data to our model
  // This handles real-time webhook from GF
  
  try {
    const entryData = {
      wpEntryId: (data.entry_id || data.id || Date.now()).toString(),
      firstName: data['1.3'] || data.first_name || data['1'] || 'Unknown',
      lastName: data['1.6'] || data.last_name || data['2'] || 'Unknown',
      email: data['3'] || data.email || '',
      mobile: data['4'] || data.phone || data.mobile || '',
      branch: data['5'] || data.branch || 'Main',
      details: JSON.stringify(data),
    };

    const loan = await prisma.loanApplication.upsert({
      where: { wpEntryId: entryData.wpEntryId },
      update: entryData,
      create: entryData
    });
    
    res.json({ success: true, id: loan.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Manual sync trigger endpoint
app.post('/api/sync/gravity-forms', async (req, res) => {
  try {
    const result = await syncGravityFormsEntries();
    res.json({ success: true, ...result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Get sync status
app.get('/api/sync/status', async (req, res) => {
  const count = await prisma.loanApplication.count();
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  
  res.json({
    totalEntries: count,
    lastSyncTime: settings?.lastSyncTime,
    syncInterval: `${settings?.syncInterval || 5} წუთი`
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Gravity Forms sync scheduled`);
});
