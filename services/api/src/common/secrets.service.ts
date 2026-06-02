import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

@Injectable()
export class SecretsService implements OnModuleInit {
  private readonly logger = new Logger(SecretsService.name);
  private secretsManagerClient: SecretsManagerClient;
  private secretsCache: Map<string, string> = new Map();
  private isInitialized = false;

  constructor(private configService: ConfigService) {
    const awsRegion = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.secretsManagerClient = new SecretsManagerClient({
      region: awsRegion,
    });
  }

  async onModuleInit(): Promise<void> {
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';

    if (nodeEnv === 'production' || nodeEnv === 'staging') {
      try {
        await this.loadSecretsFromAWS();
        this.isInitialized = true;
        this.logger.log('AWS Secrets Manager initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize AWS Secrets Manager', error);
        throw error;
      }
    } else {
      this.logger.log(
        `Skipping AWS Secrets Manager in ${nodeEnv} environment, using local .env`,
      );
      this.isInitialized = true;
    }
  }

  private async loadSecretsFromAWS(): Promise<void> {
    const secretName = this.configService.get<string>(
      'AWS_SECRETS_NAME',
    ) || `imobi/${this.configService.get<string>('NODE_ENV')}`;

    try {
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.secretsManagerClient.send(command);

      if (response.SecretString) {
        const secrets = JSON.parse(response.SecretString);
        Object.entries(secrets).forEach(([key, value]) => {
          this.secretsCache.set(key, value as string);
        });

        this.logger.log(
          `Loaded ${this.secretsCache.size} secrets from AWS Secrets Manager`,
        );
      } else if (response.SecretBinary) {
        this.logger.warn('SecretBinary format not supported, using local .env');
      }
    } catch (error) {
      this.logger.error(
        `Failed to fetch secrets from AWS Secrets Manager: ${error.message}`,
      );
      throw new Error(
        `Failed to load secrets from AWS: ${error.message}. Make sure the secret exists and credentials are configured.`,
      );
    }
  }

  get(key: string, fallback?: string): string {
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';

    if (nodeEnv === 'development') {
      return this.configService.get<string>(key) || fallback || '';
    }

    if (!this.isInitialized) {
      throw new Error('SecretsService not initialized');
    }

    const value = this.secretsCache.get(key) ||
      this.configService.get<string>(key) || fallback;

    if (!value) {
      this.logger.warn(`Secret not found: ${key}`);
      return '';
    }

    return value;
  }

  getRequired(key: string): string {
    const value = this.get(key);
    if (!value) {
      throw new Error(`Required secret not found: ${key}`);
    }
    return value;
  }

  getAllSecrets(): Record<string, string> {
    const secrets: Record<string, string> = {};
    this.secretsCache.forEach((value, key) => {
      secrets[key] = value;
    });
    return secrets;
  }

  isCached(key: string): boolean {
    return this.secretsCache.has(key);
  }

  clearCache(): void {
    this.secretsCache.clear();
    this.logger.log('Secrets cache cleared');
  }

  async refreshSecrets(): Promise<void> {
    this.clearCache();
    await this.loadSecretsFromAWS();
    this.logger.log('Secrets refreshed from AWS Secrets Manager');
  }
}
