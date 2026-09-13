import { HeartHandshake } from 'lucide-react';
import support from '../data/project-support.json';

export default function ProjectSupport() {
  let donationUrl = '';
  try {
    const parsed = new URL(support.donationUrl);
    if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) donationUrl = parsed.href;
  } catch { /* No donation page has been configured. */ }
  return <footer className="ba-project-support">
    <HeartHandshake aria-hidden="true" />
    <div><strong>Free to use. Every feature included.</strong><p>{donationUrl ? 'If this tool helps you, you can support its development. Donations are optional and unlock no extra features.' : 'No payment or subscription is required.'}</p></div>
    {donationUrl && <a href={donationUrl} target="_blank" rel="noopener noreferrer">{support.label} ↗</a>}
  </footer>;
}
