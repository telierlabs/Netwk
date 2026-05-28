import midtransClient from 'midtrans-client';

export default async function handler(req, res) {
  // Pastikan cuma menerima request POST dari tombol frontend
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Nangkep data yang dikirim dari SubscriptionModal.tsx
    const { planId, isYearly } = req.body;

    // Tentukan harga berdasarkan plan yang dipilih (dalam satuan Rupiah)
    let price = 0;
    if (planId === 'lite') price = isYearly ? 490000 : 49000;
    if (planId === 'plus') price = isYearly ? 1190000 : 119000;
    if (planId === 'pro') price = isYearly ? 2490000 : 249000;
    if (planId === 'ultra') price = isYearly ? 4990000 : 499000;

    // Inisialisasi Midtrans Snap
    let snap = new midtransClient.Snap({
      isProduction: false, // Wajib false selama masa Sandbox/Testing
      serverKey: process.env.MIDTRANS_SERVER_KEY // Vercel bakal narik kuncinya dari settingan Environment Variables
    });

    // Setup detail transaksi
    let parameter = {
      "transaction_details": {
        "order_id": `CYLEN-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // ID unik tiap transaksi
        "gross_amount": price
      },
      "customer_details": {
        "first_name": "User",
        "last_name": "Premium",
        "email": "user@example.com"
      }
    };

    // Generate link pembayaran ke Midtrans
    const transaction = await snap.createTransaction(parameter);
    
    // Kirim URL balikan ke frontend biar user bisa di-redirect
    res.status(200).json({ redirect_url: transaction.redirect_url });

  } catch (error) {
    console.error('Midtrans Error:', error);
    res.status(500).json({ error: 'Gagal membuat transaksi, cek log Vercel.' });
  }
}
