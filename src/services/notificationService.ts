
export interface NotificationConfig {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  emailRecipient: string;
  phoneRecipient: string;
}

class NotificationService {
  private config: NotificationConfig = {
    emailEnabled: false,
    whatsappEnabled: false,
    smsEnabled: false,
    emailRecipient: '',
    phoneRecipient: '',
  };

  private lastAlerts: Record<string, number> = {};
  private ALERT_COOLDOWN = 300000; // 5 minutes cooldown per sensor
  private simulateMode: boolean = false;

  setSimulateMode(enabled: boolean) {
    this.simulateMode = enabled;
    console.log(`🛠 Mode Simulation ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
  }

  updateConfig(newConfig: NotificationConfig) {
    this.config = newConfig;
  }

  async sendAlert(sensorName: string, type: string, value: number, unit: string, location: string, status: 'WARNING' | 'DANGER') {
    const now = Date.now();
    const alertKey = `${sensorName}_${type}_${status}`; // Include status in key to allow transition alerts

    if (this.lastAlerts[alertKey] && now - this.lastAlerts[alertKey] < this.ALERT_COOLDOWN) {
      return; // Prevent spamming
    }

    this.lastAlerts[alertKey] = now;

    const isDanger = status === 'DANGER';
    const isGas = ['H2S', 'CO', 'CO2', 'SMOKE', 'LPG'].includes(type);
    
    const emoji = isDanger ? '🚨' : '⚠️';
    const severity = isDanger ? (isGas ? 'TOXIQUE' : 'CRITIQUE') : 'AVERTISSEMENT';
    const action = isDanger ? 'Évacuation immédiate recommandée.' : 'Veuillez vérifier l\'unité et la zone.';

    const message = `${emoji} ${severity} SUPREMIA ${emoji}\nCapteur: ${sensorName}\nType: ${type}\nValeur: ${value}${unit}\nLocalisation: ${location}\nAction: ${action}`;

    this.broadcast(message, `${severity}: ${sensorName}`);
  }

  async sendStatusChange(sensorName: string, type: string, oldStatus: string, newStatus: string, value: number, unit: string) {
    const displayStatus = (s: string) => s === 'DANGER' ? 'TOXIQUE' : s;
    const emoji = newStatus === 'SAFE' ? '✅' : (newStatus === 'WARNING' ? '⚠️' : '🚨');
    const message = `${emoji} CHANGEMENT DE STATUT SUPREMIA ${emoji}\nCapteur: ${sensorName}\nType: ${type}\nTransition: ${displayStatus(oldStatus)} ➔ ${displayStatus(newStatus)}\nValeur actuelle: ${value}${unit}`;
    
    this.broadcast(message, `Statut: ${sensorName} (${displayStatus(newStatus)})`);
  }

  async sendConnectivityChange(sensorName: string, isOnline: boolean) {
    const emoji = isOnline ? '🟢' : '🔴';
    const status = isOnline ? 'EN LIGNE' : 'HORS LIGNE';
    const message = `${emoji} CONNECTIVITÉ SUPREMIA ${emoji}\nCapteur: ${sensorName}\nÉtat: ${status}`;
    
    const subject = `Connectivité: ${sensorName} (${status})`;
    console.log(`🔔 Notification: ${subject}\n${message}`);

    if (this.config.emailEnabled && this.config.emailRecipient) {
      this.sendEmail(this.config.emailRecipient, subject, message);
    }

    if (this.config.whatsappEnabled && this.config.phoneRecipient) {
      this.sendWhatsApp(this.config.phoneRecipient, message);
    }

    if (this.config.smsEnabled && this.config.phoneRecipient) {
      this.sendSMS(this.config.phoneRecipient, message);
    }
  }

  private broadcast(message: string, subject: string) {
    console.log(`🔔 Notification: ${subject}\n${message}`);

    if (this.config.emailEnabled && this.config.emailRecipient) {
      this.sendEmail(this.config.emailRecipient, subject, message);
    }

    if (this.config.whatsappEnabled && this.config.phoneRecipient) {
      this.sendWhatsApp(this.config.phoneRecipient, message);
    }

    if (this.config.smsEnabled && this.config.phoneRecipient) {
      this.sendSMS(this.config.phoneRecipient, message);
    }
  }

  private async sendEmail(to: string, subject: string, text: string) {
    try {
      console.log(`🚀 Tentative d'envoi Email vers ${to}...`);
      const response = await fetch(`${window.location.origin}/api/notify/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, text, simulate: this.simulateMode })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Erreur HTTP: ${response.status}`);
      
      if (data.simulated) {
        console.warn(`⚠️ [AUTO-SIMULATION] Email vers ${to}: ${data.message}`);
      } else {
        console.log(`📧 Email envoyé vers ${to}:`, data);
      }
    } catch (error: any) {
      console.error('Erreur envoi Email:', error.message);
      if (error.message === 'Failed to fetch') {
        console.error('💡 Conseil: Vérifiez que le serveur backend est bien démarré.');
      }
    }
  }

  private async sendWhatsApp(to: string, message: string) {
    try {
      console.log(`🚀 Tentative d'envoi WhatsApp vers ${to}...`);
      const response = await fetch(`${window.location.origin}/api/notify/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message, simulate: this.simulateMode })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Erreur HTTP: ${response.status}`);
      
      if (data.simulated) {
        console.warn(`⚠️ [AUTO-SIMULATION] WhatsApp vers ${to}: ${data.message}`);
      } else {
        console.log(`💬 WhatsApp envoyé vers ${to}:`, data);
      }
    } catch (error: any) {
      console.error('Erreur envoi WhatsApp:', error.message);
      if (error.message === 'Failed to fetch') {
        console.error('💡 Conseil: Vérifiez que le serveur backend est bien démarré.');
      }
    }
  }

  private async sendSMS(to: string, message: string) {
    try {
      console.log(`🚀 Tentative d'envoi SMS vers ${to}...`);
      const response = await fetch(`${window.location.origin}/api/notify/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message, simulate: this.simulateMode })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Erreur HTTP: ${response.status}`);
      
      if (data.simulated) {
        console.warn(`⚠️ [AUTO-SIMULATION] SMS vers ${to}: ${data.message}`);
      } else {
        console.log(`📱 SMS envoyé vers ${to}:`, data);
      }
    } catch (error: any) {
      console.error('Erreur envoi SMS:', error.message);
      if (error.message === 'Failed to fetch') {
        console.error('💡 Conseil: Vérifiez que le serveur backend est bien démarré.');
      }
    }
  }
}

export const notificationService = new NotificationService();
