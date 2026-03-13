import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";
import twilio from "twilio";
import cron from "node-cron";
import mqtt from "mqtt";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import admin from "firebase-admin";

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}
const db = admin.firestore();

// Configuration des services tiers (via variables d'environnement)
const CONFIG = {
  TWILIO_SID: (process.env.TWILIO_ACCOUNT_SID || "").trim(),
  TWILIO_TOKEN: (process.env.TWILIO_AUTH_TOKEN || "").trim(),
  TWILIO_PHONE: (process.env.TWILIO_PHONE_NUMBER || "").trim(),
  TWILIO_WHATSAPP: (process.env.TWILIO_WHATSAPP_NUMBER || "").trim(),
  SENDGRID_KEY: (process.env.SENDGRID_API_KEY || "").trim(),
  FROM_EMAIL: (process.env.FROM_EMAIL || "").trim()
};

// Initialize SendGrid
if (CONFIG.SENDGRID_KEY) {
  sgMail.setApiKey(CONFIG.SENDGRID_KEY);
}

// Lazy Twilio client
let twilioClient: any = null;
const getTwilioClient = () => {
  if (!twilioClient && CONFIG.TWILIO_SID && CONFIG.TWILIO_TOKEN) {
    twilioClient = twilio(CONFIG.TWILIO_SID, CONFIG.TWILIO_TOKEN);
  }
  return twilioClient;
};

// --- Reporting System Logic ---

interface SensorStats {
  id: string;
  type: string;
  min: number;
  max: number;
  alertCount: number;
  lastValue: number;
  status: string;
}

const sensorStats: Record<string, SensorStats> = {};

// MQTT Connection for Server-side tracking
const startMqttTracking = async () => {
  // Fetch MQTT config from a default user or settings
  // For simplicity, we'll use the default config if we can't find one
  const defaultMqtt = {
    broker: "broker.emqx.io",
    port: 8084,
    clientId: `supremia_server_${Math.random().toString(16).slice(2, 10)}`
  };

  const brokerUrl = `wss://${defaultMqtt.broker}:${defaultMqtt.port}`;
  const client = mqtt.connect(brokerUrl, { clientId: defaultMqtt.clientId });

  client.on("connect", () => {
    console.log("[SERVER] ✅ MQTT Connected for tracking");
    client.subscribe("supremia/data/#");
  });

  client.on("message", (topic, message) => {
    try {
      const payload = message.toString();
      const data = JSON.parse(payload);
      
      const topicParts = topic.split('/');
      const topicId = topicParts[topicParts.length - 1];
      let sensorId = "";
      if (data.sensor_name && data.sensor_name.startsWith('OCP_')) {
        sensorId = data.sensor_name;
      } else if (topicId && topicId.startsWith('OCP_')) {
        sensorId = topicId;
      }

      if (!sensorId) return;

      const value = data.temperature ?? data.temp ?? data.humidity ?? data.hum ?? data.co2_ppm ?? data.co2 ?? data.smoke_ppm ?? data.smoke ?? data.value ?? data.val;
      
      if (value !== undefined) {
        if (!sensorStats[sensorId]) {
          sensorStats[sensorId] = {
            id: sensorId,
            type: data.type || "GENERIC",
            min: value,
            max: value,
            alertCount: 0,
            lastValue: value,
            status: "SAFE"
          };
        } else {
          sensorStats[sensorId].min = Math.min(sensorStats[sensorId].min, value);
          sensorStats[sensorId].max = Math.max(sensorStats[sensorId].max, value);
          sensorStats[sensorId].lastValue = value;
        }
        
        // Simple status check for alert count
        const status = getStatus(sensorStats[sensorId].type, value);
        if (status !== "SAFE" && sensorStats[sensorId].status === "SAFE") {
          sensorStats[sensorId].alertCount++;
        }
        sensorStats[sensorId].status = status;
      }
    } catch (e) {
      // Ignore parse errors
    }
  });
};

const getStatus = (type: string, value: number): string => {
  if (type === 'TEMP') return value > 35 ? 'DANGER' : (value > 30 ? 'WARNING' : 'SAFE');
  if (type === 'HUM') return (value < 20 || value > 80) ? 'DANGER' : ((value < 30 || value > 70) ? 'WARNING' : 'SAFE');
  if (type === 'CO2') return value > 1500 ? 'DANGER' : (value > 1000 ? 'WARNING' : 'SAFE');
  if (type === 'SMOKE' || type === 'LPG') return value > 200 ? 'DANGER' : (value > 100 ? 'WARNING' : 'SAFE');
  if (type === 'H2S') return value > 10 ? 'DANGER' : (value > 5 ? 'WARNING' : 'SAFE');
  if (type === 'CO') return value > 50 ? 'DANGER' : (value > 30 ? 'WARNING' : 'SAFE');
  return 'SAFE';
};

const generateAndStoreReport = async (type: "DAILY" | "WEEKLY" | "MONTHLY") => {
  console.log(`[SERVER] 📊 Generating ${type} report...`);
  
  const timestamp = new Date().toISOString();
  const reportId = `${type}_${Date.now()}`;
  
  const reportData = Object.values(sensorStats).map(s => ({
    sensorId: s.id,
    sensorType: s.type,
    minVal: s.min,
    maxVal: s.max,
    alertCount: s.alertCount,
    status: s.status
  }));

  if (reportData.length === 0) {
    console.log("[SERVER] ⚠️ No sensor data available for report");
    return;
  }

  // Generate PDF
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text(`Rapport ${type} - SUPREMIA`, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Généré le: ${new Date().toLocaleString()}`, 14, 30);

  const tableData = reportData.map(s => [
    s.sensorId,
    s.sensorType,
    s.minVal.toFixed(2),
    s.maxVal.toFixed(2),
    s.alertCount.toString(),
    s.status
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['ID', 'TYPE', 'VAL Min', 'VAL Max', 'ALERTE', 'STATUT']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [0, 150, 136] }
  });

  const pdfBase64 = doc.output('datauristring').split(',')[1];

  // Store in Firestore
  try {
    await db.collection("reports").doc(reportId).set({
      id: reportId,
      type,
      timestamp,
      data: reportData,
      pdfBase64
    });
    console.log(`[SERVER] ✅ Report ${reportId} stored successfully`);
    
    // Reset stats for next period
    Object.keys(sensorStats).forEach(id => {
      const s = sensorStats[id];
      sensorStats[id] = {
        ...s,
        min: s.lastValue,
        max: s.lastValue,
        alertCount: 0
      };
    });
  } catch (error) {
    console.error("[SERVER] ❌ Error storing report:", error);
  }
};

// Cron Jobs
// DAILY: 6H, 14H, 22H
cron.schedule("0 6,14,22 * * *", () => generateAndStoreReport("DAILY"));

// WEEKLY: Monday at 8H
cron.schedule("0 8 * * 1", () => generateAndStoreReport("WEEKLY"));

// MONTHLY: 1st of month at 0H
cron.schedule("0 0 1 * *", () => generateAndStoreReport("MONTHLY"));

// --- End Reporting System Logic ---

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Start MQTT Tracking
  startMqttTracking();

  // Log all requests
  app.use((req, res, next) => {
    console.log(`[SERVER] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      notifications: {
        email: !!CONFIG.SENDGRID_KEY,
        twilio: !!(CONFIG.TWILIO_SID && CONFIG.TWILIO_TOKEN)
      },
      reports: {
        trackedSensors: Object.keys(sensorStats).length
      }
    });
  });

  // API Routes for Notifications
  app.post("/api/notify/email", async (req, res) => {
    const { to, subject, text, simulate } = req.body;
    console.log(`[SERVER] 📧 Email request to: ${to} (Simulate: ${!!simulate})`);

    if (simulate || !CONFIG.SENDGRID_KEY || !CONFIG.FROM_EMAIL) {
      const reason = simulate ? "Mode Simulation Actif" : "SendGrid non configuré (Mode Démo)";
      console.log(`[SERVER] ℹ️ Email simulation: ${reason}`);
      return res.json({ 
        success: true, 
        simulated: true, 
        message: `Simulation: Email envoyé (${reason})` 
      });
    }

    try {
      await sgMail.send({
        to,
        from: CONFIG.FROM_EMAIL,
        subject,
        text,
        html: text.replace(/\n/g, '<br>'),
      });
      console.log(`[SERVER] ✅ Email envoyé avec succès via SendGrid`);
      res.json({ success: true, message: "Email sent successfully via SendGrid" });
    } catch (error: any) {
      let errorMessage = error.response?.body?.errors?.[0]?.message || error.message;
      
      const isAuthError = errorMessage.includes("authorization grant") || errorMessage.includes("Sender Identity");
      
      if (isAuthError) {
        console.info("[SERVER] ℹ️ SendGrid Auth Issue - Falling back to simulation");
        return res.json({ 
          success: true, 
          simulated: true,
          message: "Simulation: Email envoyé (Clé API SendGrid invalide ou non vérifiée)" 
        });
      }

      console.error("[SERVER] ❌ Erreur SendGrid:", errorMessage);
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  app.post("/api/notify/whatsapp", async (req, res) => {
    const { to, message, simulate } = req.body;
    console.log(`[SERVER] 💬 WhatsApp request to: ${to} (Simulate: ${!!simulate})`);

    if (simulate || !CONFIG.TWILIO_SID || !CONFIG.TWILIO_TOKEN || !CONFIG.TWILIO_WHATSAPP) {
      const reason = simulate ? "Mode Simulation Actif" : "Twilio WhatsApp non configuré (Mode Démo)";
      console.log(`[SERVER] ℹ️ WhatsApp simulation: ${reason}`);
      return res.json({ 
        success: true, 
        simulated: true, 
        message: `Simulation: WhatsApp envoyé (${reason})` 
      });
    }

    const client = getTwilioClient();

    try {
      await client.messages.create({
        from: `whatsapp:${CONFIG.TWILIO_WHATSAPP}`,
        to: `whatsapp:${to}`,
        body: message,
      });
      console.log(`[SERVER] ✅ WhatsApp envoyé avec succès via Twilio`);
      res.json({ success: true, message: "WhatsApp sent successfully via Twilio" });
    } catch (error: any) {
      let errorMessage = error.message;
      if (errorMessage.includes("daily messages limit") || errorMessage.includes("Authenticate")) {
        console.info("[SERVER] ℹ️ Twilio WhatsApp Limit/Auth Issue - Falling back to simulation");
        return res.json({ 
          success: true, 
          simulated: true,
          message: "Simulation: WhatsApp envoyé (Limite Twilio atteinte ou clé invalide)" 
        });
      }
      console.error("[SERVER] ❌ Erreur Twilio WhatsApp:", errorMessage);
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  app.post("/api/notify/sms", async (req, res) => {
    const { to, message, simulate } = req.body;
    console.log(`[SERVER] 📱 SMS request to: ${to} (Simulate: ${!!simulate})`);

    if (simulate || !CONFIG.TWILIO_SID || !CONFIG.TWILIO_TOKEN || !CONFIG.TWILIO_PHONE) {
      const reason = simulate ? "Mode Simulation Actif" : "Twilio SMS non configuré (Mode Démo)";
      console.log(`[SERVER] ℹ️ SMS simulation: ${reason}`);
      return res.json({ 
        success: true, 
        simulated: true, 
        message: `Simulation: SMS envoyé (${reason})` 
      });
    }

    const client = getTwilioClient();

    try {
      await client.messages.create({
        from: CONFIG.TWILIO_PHONE,
        to,
        body: message,
      });
      console.log(`[SERVER] ✅ SMS envoyé avec succès via Twilio`);
      res.json({ success: true, message: "SMS sent successfully via Twilio" });
    } catch (error: any) {
      let errorMessage = error.message;
      if (errorMessage.includes("daily messages limit") || errorMessage.includes("Authenticate")) {
        console.info("[SERVER] ℹ️ Twilio SMS Limit/Auth Issue - Falling back to simulation");
        return res.json({ 
          success: true, 
          simulated: true,
          message: "Simulation: SMS envoyé (Limite Twilio atteinte ou clé invalide)" 
        });
      }
      console.error("[SERVER] ❌ Erreur Twilio SMS:", errorMessage);
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // AI Prediction Mock API
  app.get("/api/ai/predictions", (req, res) => {
    res.json({
      risks: [
        { zone: 'Jorf Lasfar Unit A', gas: 'H₂S', risk: 35, trend: 'Croissante', probability: 0.24 },
        { zone: 'Safi Storage', gas: 'CO', risk: 68, trend: 'Stable', probability: 0.72 },
        { zone: 'Benguerir Mine', gas: 'Poussière', risk: 12, trend: 'Décroissante', probability: 0.05 },
      ],
      sensorHealth: [
        { id: 'S01', name: 'H2S-01', health: 87, issue: 'Dérive de calibration', lastMaintenance: '2024-02-15' },
        { id: 'S02', name: 'CO-04', health: 45, issue: 'Batterie critique', lastMaintenance: '2023-11-20' },
        { id: 'S03', name: 'TEMP-02', health: 98, issue: 'Optimal', lastMaintenance: '2024-03-01' },
      ]
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server started on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  });
}

startServer();
