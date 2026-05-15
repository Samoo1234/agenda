import { createClient } from 'supabase'
import Stripe from 'stripe'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createEdgeHttpClient()

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    let event
    if (endpointSecret) {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        endpointSecret,
        undefined,
        cryptoProvider
      )
    } else {
      event = JSON.parse(body)
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Evento recebido: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const clinicId = session.client_reference_id
        const customerId = session.customer
        const subscriptionId = session.subscription
        
        // Buscar o priceId para identificar o plano
        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)
        const priceId = subscription.items.data[0].price.id

        // Buscar qual plano corresponde a esse priceId no nosso banco
        const { data: plan } = await supabaseClient
          .from('plans')
          .select('id')
          .eq('stripe_price_id', priceId)
          .single()

        if (plan) {
          const { error } = await supabaseClient
            .from('clinics')
            .update({
              plan_id: plan.id,
              subscription_status: 'active',
              stripe_customer_id: customerId as string,
              stripe_subscription_id: subscriptionId as string,
              trial_ends_at: null // Remove trial pois agora é pagante
            })
            .eq('id', clinicId)

          if (error) console.error('Erro ao atualizar clínica:', error)
          else console.log(`Clínica ${clinicId} atualizada para o plano ${plan.id}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const { error } = await supabaseClient
          .from('clinics')
          .update({ subscription_status: 'expired' })
          .eq('stripe_subscription_id', subscription.id)
        
        if (error) console.error('Erro ao cancelar assinatura:', error)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error(`Erro no Webhook: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})
