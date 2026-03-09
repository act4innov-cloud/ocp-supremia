import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";
import twilio from "twilio";

dotenv.config();

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

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
