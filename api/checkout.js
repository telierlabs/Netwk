export default async function handler(req, res) {
  // Cuma terima POST request dari tombol Upgrade
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { planId, period } = body; // Mendukung parameter period ('weekly' atau 'monthly')

    // Harga paket sesuai dengan yang ada di SubscriptionModal.tsx
    const PLAN_PRICES = {
      lite: { weekly: 129000, monthly: 349000, name: 'Paket Lite Cylen' },
      plus: { weekly: 199000, monthly: 549000, name: 'Paket Plus Cylen' },
      pro: { weekly: 299000, monthly: 799000, name: 'Paket Pro Cylen' },
    };

    if (!planId || !period || !PLAN_PRICES[planId]) {
      return res.status(400).json({ error: 'Invalid plan or period' });
    }

    const plan = PLAN_PRICES[planId];
    const amount = period === 'weekly' ? plan.weekly : plan.monthly;
    const externalId = `cylen-${planId}-${period}-${Date.now()}`;

    // Ambil Secret Key Xendit dari environment variable Vercel
    const xenditSecretKey = process.env.XENDIT_SECRET_KEY || '';
    if (!xenditSecretKey) {
      return res.status(500).json({ error: 'XENDIT_SECRET_KEY is not configured on server' });
    }

    // Xendit otorisasi menggunakan Basic Auth (Base64 dari secretKey + ':')
    const encodedKey = Buffer.from(xenditSecretKey + ':').toString('base64');

    // Tembak API Xendit Invoices
    const response = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encodedKey}`
      },
      body: JSON.stringify({
        external_id: externalId,
        amount: amount,
        description: `Langganan ${plan.name} (${period === 'weekly' ? 'Mingguan' : 'Bulanan'})`,
        invoice_duration: 86400, // Berlaku 24 jam
        currency: 'IDR',
        success_redirect_url: 'https://www.cylenai.com/dashboard?payment=success',
        failure_redirect_url: 'https://www.cylenai.com/dashboard?payment=failed',
        customer: {
          email: 'user@cylenai.com',
          given_names: 'Cylen User'
        }
      })
    });

    const data = await response.json();

    if (response.ok && data.invoice_url) {
      return res.status(200).json({ redirect_url: data.invoice_url });
    } else {
      console.error('Xendit Error:', data);
      return res.status(500).json({ error: data.message || 'Gagal membuat tagihan Xendit' });
    }

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Server Internal Error' });
  }
        }
