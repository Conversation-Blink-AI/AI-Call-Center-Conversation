
import { paypalClient } from '../lib/paypalClient.js'
import paypal from '@paypal/checkout-server-sdk'

async function run() {
  try {
    console.log('Creating a $1.00 test order with PayPal…')

    // Build the order request
    const request = new paypal.orders.OrdersCreateRequest()
    request.prefer('return=representation')
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: '1.00'
        }
      }]
    })

    // Execute the request
    const response = await paypalClient.execute(request)
    
    console.log(`✓ Order created! ID: ${response.result.id}`)
    
  } catch (error) {
    console.error('Error creating PayPal order:', error)
    process.exit(1)
  }
}

run()
