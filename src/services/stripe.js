// Stripe scaffolding — listo para activar cuando se decidan los pagos.
// Para activar:
// 1. npm install stripe en backend/
// 2. Pegar claves en .env (STRIPE_SECRET_KEY, STRIPE_PUBLIC_KEY, STRIPE_WEBHOOK_SECRET)
// 3. Descomentar el import y las funciones, y la ruta en server.js

// import Stripe from 'stripe';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// export async function createCheckoutSession({ items, customerId, successUrl, cancelUrl }) {
//   return stripe.checkout.sessions.create({
//     mode: 'payment',
//     line_items: items,
//     customer: customerId,
//     success_url: successUrl,
//     cancel_url: cancelUrl,
//   });
// }

// export async function createPaymentIntent({ amount, currency = 'clp', metadata = {} }) {
//   return stripe.paymentIntents.create({ amount, currency, metadata });
// }

// export async function retrievePaymentIntent(id) {
//   return stripe.paymentIntents.retrieve(id);
// }

// export function handleWebhookEvent(event) {
//   switch (event.type) {
//     case 'payment_intent.succeeded':
//     case 'checkout.session.completed':
//     case 'charge.refunded':
//       // TODO: actualizar registro en `orders`
//       return;
//     default:
//       return;
//   }
// }

export const STRIPE_PLACEHOLDER = true;
