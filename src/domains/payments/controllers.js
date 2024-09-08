const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { sendEmail } = require("../nodemailer/controllers");
const { v4: uuidv4 } = require("uuid");
const User = require("../user/model");

function generateTransactionId() {
  return uuidv4();
}

function convertToUSD(price) {
  return price * 100;
}

async function handlePaymentSuccess(email) {
  try {
    const user = await User.findOne({ email });
    if (user) {
      user.paymentStatus = "paid";
      await user.save();
    }
  } catch (error) {
    console.error("Error in payment success:", error);
  }
}

module.exports = {
  createCheckoutSession: async (req, res) => {
    const { name, email, type, items } = req.body;
    const transactionId = generateTransactionId();

    const lineItems = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.title,
          images: [
            "https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcTK_Qsmy_ahLnSY2XSCu5qdlVdrwSXqbXJx90XP42YXGIkeSnrj",
          ],
        },
        unit_amount: convertToUSD(item.price),
      },
      quantity: 1,
    }));

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${process.env.BASE_URL}?success=true&transaction_id=${transactionId}`,
        cancel_url: `${process.env.BASE_URL}/checkout?success=false&transaction_id=${transactionId}`,
        client_reference_id: transactionId,
        metadata: {
          name: name,
          email: email,
          type: type,
        },
      });

      res.json({ redirectUrl: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).send({ error: "Failed to create checkout session" });
    }
  },

  handleStripeWebhook: async (req, res) => {
    let event;

    try {
      const stripeSignature = req.headers["stripe-signature"];
      const rawBody = req.body;

      event = stripe.webhooks.constructEvent(
        rawBody,
        stripeSignature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Error verifying webhook signature:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(event.type);
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;

        console.log("checkout.session.completed");
        console.log(session.mode);

        if (session.mode === "payment") {
          try {
            lineItems = await stripe.checkout.sessions.listLineItems(
              session.id
            );
          } catch (error) {
            console.error("Error fetching line items:", error);
          }

          const { metadata } = session;
          try {
            await sendEmail({
              name: metadata.name,
              email: metadata.email,
              type: metadata.type,
              items: lineItems.data,
            });
          } catch (error) {
            console.error("Error sending email:", error);
            return res.status(500).send({ error: "Failed to send email" });
          }
        } else if (session.mode === "subscription") {
          const { email } = session.metadata;
          await handlePaymentSuccess(email);

          console.log("subscription");
        }

        let lineItems;

        break;
      case "invoice.payment_succeeded":
        console.log("invoice.payment_succeeded");

        break;

      case "payment_intent.succeeded":
        console.log("payment_intent.succeeded");
        const paymentIntent = event.data.object;

        try {
          const customer = await stripe.customers.retrieve(
            paymentIntent.customer
          );
          const paymentMethods = await stripe.customers.listPaymentMethods(
            paymentIntent.customer,
            {
              type: "card",
              limit: 1,
            }
          );

          const last4 = paymentMethods.data[0].card.last4;
          const email = customer.email;

          console.log("Last 4 digits of the card:", last4);
          console.log("Email:", email);
        } catch (error) {
          console.error("Error retrieving customer or payment method:", error);
        }
        break;
      case "invoice.payment_failed":
        console.log("invoice.payment_failed");

        break;
      case "customer.subscription.created":
        const startDateUnix = 1721396865;
        const currentPeriodEndUnix = 1752932865;
        const currentPeriodStartUnix = 1721396865;

        // Перетворення Unix Timestamp у об'єкти Date
        const startDate = new Date(startDateUnix * 1000); // Потрібно множити на 1000 для переведення у мілісекунди
        const currentPeriodEnd = new Date(currentPeriodEndUnix * 1000);
        const currentPeriodStart = new Date(currentPeriodStartUnix * 1000);

        console.log(startDate); // Перевірка перетворення у консолі
        console.log(currentPeriodEnd);
        console.log(currentPeriodStart);

        const eve = event.data.object;
        console.log("Customer", eve.customer);
        console.log("Customer", eve.plan.metadata);
        console.log("Customer", eve.plan.created);

        break;
      case "customer.subscription.updated":
        console.log("customer.subscription.updated");
      // Додайте інші типи подій, які вам потрібні
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  },

  createSubscriptionCheckoutSession: async (req, res) => {
    const { lookupKey, email } = req.body;
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
    });

    try {
      price_id = prices["data"][0]["id"];

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [
          {
            price: price_id,
            quantity: 1,
          },
        ],
        metadata: {
          email: email,
        },
        success_url: `${process.env.BASE_URL}/dashboard`,
        cancel_url: `${process.env.BASE_URL}/payment-plans`,
      });
      res.json({ redirectUrl: session.url });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  },

  getProductPrices: async (req, res) => {
    const productIds = [process.env.PRO_PRODUCT, process.env.CUSTOMER_PRODUCT];

    try {
      const products = await Promise.all(
        productIds.map(async (productId) => {
          const product = await stripe.products.retrieve(productId);
          const prices = await stripe.prices.list({
            product: product.id,
            active: true,
          });
          return {
            product: product,
            prices: prices.data,
          };
        })
      );

      const productPrices = products.map((product) => {
        return {
          productId: product.product.id,
          productName: product.product.name,
          type: product.product.metadata.type,
          prices: product.prices.map((price) => ({
            priceId: price.id,
            unitAmount: price.unit_amount,
            currency: price.currency,
            recurring: price.recurring ? price.recurring.interval : null,
          })),
        };
      });

      res.status(200).json(productPrices);
    } catch (error) {
      console.error("Error fetching product prices:", error);
      res.status(500).json({ error: error.message });
    }
  },
};
