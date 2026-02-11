const submitBtn = document.getElementById('submit') as HTMLButtonElement;
const clearBtn = document.getElementById('clear') as HTMLButtonElement;
const textarea = document.getElementById('envelope') as HTMLTextAreaElement;
const result = document.getElementById('result') as HTMLPreElement;

const endpoint = '/api/invariant-envelope';

async function sendEnvelope() {
  result.textContent = 'Dispatching…';
  try {
    const payload = JSON.parse(textarea.value || '{}');
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    result.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    result.textContent = `Invalid payload or request failed: ${err}`;
  }
}

submitBtn?.addEventListener('click', sendEnvelope);
clearBtn?.addEventListener('click', () => {
  textarea.value = '';
  result.textContent = 'Ready.';
});
