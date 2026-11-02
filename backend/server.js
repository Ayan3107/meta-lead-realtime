
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const PORT = 3000;

const PAGE_ID = process.env.PAGE_ID;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const DEBUG_SYNC_KEY = process.env.DEBUG_SYNC_KEY;

let leads = [];
const processedLeadIds = new Set();

app.get('/', (req, res) => {
  res.send('Meta Leads Backend is running!');
});

// Fetch a lead from Meta and broadcast it to connected apps
async function fetchAndBroadcastLead(leadId) {
  if (!leadId || processedLeadIds.has(leadId)) {
    return null;
  }

  const url = new URL(
    `https://graph.facebook.com/v26.0/${leadId}`
  );

  url.searchParams.set('fields', 'created_time,field_data');
  url.searchParams.set('access_token', PAGE_ACCESS_TOKEN);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || 'Meta API request failed'
    );
  }

  const fields = Object.fromEntries(
    (data.field_data || []).map((field) => [
      field.name,
      field.values?.[0] || '',
    ])
  );

  const firstName = fields.first_name || '';
  const lastName = fields.last_name || '';

  const newLead = {
    id: leadId,
    name:
      fields.full_name ||
      `${firstName} ${lastName}`.trim() ||
      'Unknown',
    email:
      fields.email ||
      fields.work_email_address ||
      '',
    phone:
      fields.phone_number ||
      '',
    createdAt:
      data.created_time || new Date().toISOString(),
  };

  leads.unshift(newLead);
  processedLeadIds.add(leadId);

  io.emit('newLead', newLead);

  console.log('New Meta lead broadcast:', newLead.id);

  return newLead;
}

// Meta webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Meta webhook verified!');
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// Receive Meta lead notifications
app.post('/webhook', async (req, res) => {
  // Acknowledge Meta immediately
  res.sendStatus(200);

  if (req.body.object !== 'page') return;

  for (const entry of req.body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue;

      const leadId = change.value.leadgen_id;

      console.log('Meta leadgen webhook received:', change.value);

      // Ignore Meta's dashboard placeholder event
      if (!leadId || leadId === '444444444444') {
        console.log('Skipping Meta placeholder event.');
        continue;
      }

      try {
        await fetchAndBroadcastLead(leadId);
      } catch (error) {
        console.error(
          'Failed to retrieve Meta lead:',
          error.message
        );
      }
    }
  }
});

// Diagnostic endpoint: manually sync a known Meta test lead
app.post('/debug/sync-lead', async (req, res) => {
  if (
    !DEBUG_SYNC_KEY ||
    req.headers['x-debug-key'] !== DEBUG_SYNC_KEY
  ) {
    return res.sendStatus(403);
  }

  const { leadId } = req.body;

  if (!leadId) {
    return res.status(400).json({
      error: 'leadId is required',
    });
  }

  try {
    const lead = await fetchAndBroadcastLead(String(leadId));

    if (!lead) {
      return res.json({
        message: 'Lead was already processed',
      });
    }

    res.json({
      message: 'Meta lead retrieved and broadcast successfully',
      lead,
    });
  } catch (error) {
    console.error('Manual Meta sync failed:', error.message);

    res.status(500).json({
      error: error.message,
    });
  }
});

// Get all received leads
app.get('/leads', (req, res) => {
  res.json(leads);
});

// Manual local development test endpoint
app.post('/leads', (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({
      error: 'Name, email and phone are required',
    });
  }

  const newLead = {
    id: Date.now().toString(),
    name,
    email,
    phone,
    createdAt: new Date().toISOString(),
  };

  leads.unshift(newLead);
  io.emit('newLead', newLead);

  console.log('Manual test lead received:', newLead.name);

  res.status(201).json({
    message: 'Lead received successfully',
    lead: newLead,
  });
});

// Mobile app connection
io.on('connection', (socket) => {
  console.log('Mobile app connected:', socket.id);

  socket.emit('leads', leads);

  socket.on('disconnect', () => {
    console.log('Mobile app disconnected:', socket.id);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);

  if (!PAGE_ID || !PAGE_ACCESS_TOKEN || !VERIFY_TOKEN) {
    console.warn('Warning: Meta credentials are missing from .env');
  }

  if (!DEBUG_SYNC_KEY) {
    console.warn('Warning: DEBUG_SYNC_KEY is missing from .env');
  }
});
