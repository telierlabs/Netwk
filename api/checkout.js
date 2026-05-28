export default async function handler(req, res) {
  // Cuma terima POST request dari tombol Upgrade
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Tangkap data dengan aman
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { planId, isYearly } = body;

    // Tentukan harga
    let price = 0;
    if (planId === 'lite') price = isYearly ? 490000 : 49000;
    if (planId === 'plus') price = isYearly ? 1190000 : 119000;
    if (planId === 'pro') price = isYearly ? 2490000 : 249000;
    if (planId === 'ultra') price = isYearly ? 4990000 : 499000;

    // Ambil kunci rahasia dari Vercel
    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    
    // Midtrans butuh otorisasi format: Basic base64(serverKey + ":")
    const encodedKey = Buffer.from(serverKey + ':').toString('base64');

    // Tembak langsung API Sandbox Midtrans (Tanpa Library)
    const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encodedKey}`
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: `CYLEN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          gross_amount: price
        },
        customer_details: {
          first_name: "Cylen",
          last_name: "Premium",
          email: "user@cylen.teliernews.com"
        }
      })
    });

    const data = await response.json();

    // Kalau sukses dapet link dari Midtrans
    if (response.ok && data.redirect_url) {
      res.status(200).json({ redirect_url: data.redirect_url });
    } else {
      console.error('Midtrans Reject:', data);
      res.status(500).json({ error: 'Ditolak Midtrans, cek kunci atau parameter' });
    }

  } catch (error) {
    console.error('Vercel Error:', error);
    res.status(500).json({ error: 'Server Internal Error' });
  }
}
