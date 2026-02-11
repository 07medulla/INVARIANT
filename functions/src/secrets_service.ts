import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();
const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG && JSON.parse(process.env.FIREBASE_CONFIG).projectId;

export async function getSecret(secretName: string): Promise<string> {
  const envKey = process.env[secretName];
  if (envKey) {
    return envKey;
  }

  if (!projectId) {
    throw new Error(`Project ID missing and env var ${secretName} not set`);
  }

  const [version] = await client.accessSecretVersion({
    name: `projects/${projectId}/secrets/${secretName}/versions/latest`
  });

  const data = version.payload?.data?.toString();
  if (!data) {
    throw new Error(`Secret ${secretName} payload empty`);
  }
  return data;
}
