
export interface MQTTConfig {
  broker: string;
  port: number;
  clientId: string;
}

export interface NotificationConfig {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  emailRecipient: string;
  phoneRecipient: string;
}

export interface AppConfig {
  mqtt: MQTTConfig;
  notifications: NotificationConfig;
}

const DEFAULT_CONFIG: AppConfig = {
  mqtt: {
    broker: 'test.mosquitto.org',
    port: 8081,
    clientId: `supremia_client_${Math.random().toString(16).slice(2, 10)}`
  },
  notifications: {
    emailEnabled: false,
    whatsappEnabled: false,
    smsEnabled: false,
    emailRecipient: '',
    phoneRecipient: ''
  }
};

class ConfigService {
  private config: AppConfig;
  private STORAGE_KEY = 'supremia_app_config';

  constructor() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse saved config', e);
        this.config = DEFAULT_CONFIG;
      }
    } else {
      this.config = DEFAULT_CONFIG;
    }
  }

  getConfig(): AppConfig {
    return this.config;
  }

  saveMQTTConfig(mqtt: MQTTConfig) {
    this.config.mqtt = mqtt;
    this.persist();
  }

  saveNotificationConfig(notifications: NotificationConfig) {
    this.config.notifications = notifications;
    this.persist();
  }

  private persist() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
  }
}

export const configService = new ConfigService();
