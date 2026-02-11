import axios from 'axios';
import { getSecret } from './secrets_service';

export async function fetchRecruitCrmCandidate(candidateId: string): Promise<any> {
  const apiKey = await getSecret('RECRUITCRM_API_TOKEN');
  const { data } = await axios.get(`https://api.recruitcrm.io/v1/candidates/${candidateId}`, {
    headers: { Authorization: `Token token=${apiKey}` }
  });
  return data;
}

export async function syncGoogleSheet(rangeA1: string): Promise<any> {
  const serviceAccount = await getSecret('GOOGLE_SHEETS_SERVICE_ACCOUNT');
  const creds = JSON.parse(serviceAccount);
  // Placeholder until Sheets integration is wired up
  return {
    status: 'PENDING_IMPLEMENTATION',
    range: rangeA1,
    hint: 'Use googleapis sheets client with service-account JWT'
  };
}
