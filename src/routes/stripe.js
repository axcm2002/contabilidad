// Endpoint webhook de Stripe — scaffolding. Activar siguiendo README.
import { Router } from 'express';
import express from 'express';

const router = Router();

// Stripe necesita raw body para verificar la firma
router.post('/', express.raw({ type: 'application/json' }), (req, res) => {
  // const sig = req.headers['stripe-signature'];
  // const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  // handleWebhookEvent(event);
  res.json({ received: true, placeholder: true });
});

export default router;
