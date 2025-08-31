const express = require('express');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const jsonfile = require('jsonfile');
const path = require('path');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// File path for user data
const usersFile = './users.json';

// Helper function to read users from JSON file
function readUsers() {
  try {
    return jsonfile.readFileSync(usersFile);
  } catch (error) {
    return {};
  }
}

// Helper function to write users to JSON file
function writeUsers(users) {
  jsonfile.writeFileSync(usersFile, users, { spaces: 2 });
}

// Registration endpoint
app.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  const users = readUsers();

  // Check if user already exists
  if (users[email]) {
    return res.status(400).json({ 
      success: false, 
      message: 'You already have an account, please log in.' 
    });
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user object
    users[email] = {
      name,
      password: hashedPassword,
      twoFASecret: null,
      twoFAEnabled: false
    };
    
    // Save to JSON file
    writeUsers(users);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const users = readUsers();
  
  // Check if user exists
  if (!users[email]) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid email or password' 
    });
  }
  
  // Check password
  const isValidPassword = await bcrypt.compare(password, users[email].password);
  if (!isValidPassword) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid email or password' 
    });
  }
  
  res.json({ 
    success: true, 
    twoFAEnabled: users[email].twoFAEnabled 
  });
});

// 2FA setup endpoint
app.post('/setup-2fa', (req, res) => {
  const { email } = req.body;
  const users = readUsers();
  
  if (!users[email]) {
    return res.status(400).json({ success: false, message: 'User not found' });
  }
  
  // Generate a secret key for the user
  const secret = speakeasy.generateSecret({
    name: `CyberShield (${email})`
  });
  
  // Generate QR code
  QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error generating QR code' });
    }
    
    // Save the secret to the user object (temporarily, until verified)
    users[email].twoFASecret = secret.base32;
    writeUsers(users);
    
    res.json({
      success: true,
      qrCode: data_url,
      secret: secret.base32
    });
  });
});

// 2FA verification endpoint
app.post('/verify-2fa', (req, res) => {
  const { email, token } = req.body;
  const users = readUsers();
  
  if (!users[email] || !users[email].twoFASecret) {
    return res.status(400).json({ success: false, message: '2FA not set up' });
  }
  
  // Verify the token
  const verified = speakeasy.totp.verify({
    secret: users[email].twoFASecret,
    encoding: 'base32',
    token: token
  });
  
  if (verified) {
    // Mark 2FA as enabled for this user
    users[email].twoFAEnabled = true;
    writeUsers(users);
    
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, message: 'Invalid verification code' });
  }
});

// 2FA login verification endpoint
app.post('/verify-login-2fa', (req, res) => {
  const { email, token } = req.body;
  const users = readUsers();
  
  if (!users[email] || !users[email].twoFAEnabled) {
    return res.status(400).json({ success: false, message: '2FA not enabled' });
  }
  
  // Verify the token
  const verified = speakeasy.totp.verify({
    secret: users[email].twoFASecret,
    encoding: 'base32',
    token: token
  });
  
  if (verified) {
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, message: 'Invalid verification code' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
