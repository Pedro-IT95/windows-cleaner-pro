// ==========================================
// STRIPE.JS - Backend
// Windows Cleaner Pro - Stripe Integration
// by Pedro IT Solutions
// ==========================================

const express = require('express');
const router = express.Router();

// Inicializar Stripe con SECRET KEY de LIVE
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

console.log('=========================================');
console.log('✅ Stripe Module Loaded');
console.log('🔧 Mode: LIVE');
console.log('=========================================');

// ==========================================
// CREAR SESIÓN DE CHECKOUT
// ==========================================
router.post('/create-checkout-session', async (req, res) => {
    console.log('🔍 POST /create-checkout-session');
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));

    try {
        const { priceId, userId, userEmail } = req.body;

        // Validación
        if (!priceId) {
            console.error('❌ Missing priceId');
            return res.status(400).json({ error: 'Missing priceId' });
        }

        if (!userEmail) {
            console.error('❌ Missing userEmail');
            return res.status(400).json({ error: 'Missing userEmail' });
        }

        console.log('💰 Price ID:', priceId);
        console.log('📧 Email:', userEmail);
        console.log('👤 User ID:', userId);

        // Crear sesión de Stripe Checkout
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                }
            ],
            success_url: 'https://windowscleanerpro.com/gracias',
            cancel_url: 'https://windowscleanerpro.com/cancelado',
            customer_email: userEmail,
            metadata: {
                userId: userId || 'unknown',
                source: 'WindowsCleanerPro'
            },
            allow_promotion_codes: true
        });

        console.log('✅ Session created successfully');
        console.log('🆔 Session ID:', session.id);
        console.log('🔗 URL:', session.url);

        return res.status(200).json({ 
            success: true,
            url: session.url,
            sessionId: session.id
        });

    } catch (error) {
        console.error('❌ Error creating checkout session');
        console.error('Error message:', error.message);
        console.error('Error type:', error.type);
        
        return res.status(500).json({ 
            success: false,
            error: error.message || 'Error creating checkout session'
        });
    }
});

// ==========================================
// VERIFICAR SUSCRIPCIÓN
// ==========================================
router.post('/check-subscription', async (req, res) => {
    console.log('🔍 POST /check-subscription');
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));

    try {
        const { userEmail } = req.body;

        // Validación
        if (!userEmail) {
            console.error('❌ Missing userEmail');
            return res.status(400).json({ error: 'Missing userEmail' });
        }

        console.log('👤 Checking subscription for:', userEmail);

        // ==========================================
        // OVERRIDE PARA CUENTA ADMIN
        // ==========================================
        if (userEmail === 'pedro@pedroitsolutions.com') {
            console.log('🔑 Admin account detected - ENTERPRISE access granted (bypass Stripe)');
            return res.status(200).json({ 
                subscribed: true, 
                plan: 'ENTERPRISE',
                status: 'active',
                admin: true
            });
        }

        // Buscar cliente por email en Stripe
        const customers = await stripe.customers.list({
            email: userEmail,
            limit: 1
        });

        if (customers.data.length === 0) {
            console.log('ℹ️ No customer found → Plan: FREE');
            return res.status(200).json({ 
                subscribed: false, 
                plan: 'FREE'
            });
        }

        const customer = customers.data[0];
        console.log('✅ Customer found:', customer.id);

        // Obtener suscripciones activas
        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 1
        });

        if (subscriptions.data.length === 0) {
            console.log('ℹ️ No active subscription → Plan: FREE');
            return res.status(200).json({ 
                subscribed: false, 
                plan: 'FREE'
            });
        }

        const subscription = subscriptions.data[0];
        const priceId = subscription.items.data[0].price.id;

        console.log('💰 Active subscription found');
        console.log('💳 Price ID:', priceId);

        // Determinar plan basado en Price ID
        let plan = 'FREE';
        
        // LIVE Mode Price IDs
        if (priceId === process.env.STRIPE_PRO_PRICE_ID || priceId === 'price_1SXXyR8NnqA52SgyW9RN1ztX') {
            plan = 'PRO';
        } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID || priceId === 'price_1SXXzT8NnqA52Sgybud7Ldk5') {
            plan = 'ENTERPRISE';
        }

        console.log('✅ Plan:', plan);

        return res.status(200).json({
            subscribed: true,
            plan: plan,
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end
        });

    } catch (error) {
        console.error('❌ Error checking subscription');
        console.error('Error message:', error.message);
        
        return res.status(500).json({ 
            error: error.message,
            plan: 'FREE'
        });
    }
});

// ==========================================
// WEBHOOK
// ==========================================
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    console.log('🔍 POST /webhook');
    
    try {
        console.log('✅ Webhook received');
        res.status(200).json({ received: true });
    } catch (err) {
        console.error('❌ Webhook error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

// ==========================================
// HEALTH CHECK
// ==========================================
router.get('/health', (req, res) => {
    console.log('🔍 GET /health');
    res.status(200).json({ 
        status: 'ok',
        message: 'Stripe routes working',
        mode: 'LIVE',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
console.log('Designed by Pedro IT Solutions');
