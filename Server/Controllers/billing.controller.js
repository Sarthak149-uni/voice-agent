// ══════════════════════════════════════════════════════════════════════
// BILLING CONTROLLER — Payment gateway temporarily disabled
// To re-enable: uncomment the Cashfree import and restore the original
// createOrder / verifyBilling implementations below.
// ══════════════════════════════════════════════════════════════════════

// import { Cashfree } from "../Configs/cashfree.js";   // ← re-enable later
import { db, toSafeUser } from "../Configs/firebase.js";

export const createOrder = async (req, res) => {
  return res.status(503).json({
    success: false,
    message:
      "Payment gateway is temporarily unavailable. Please try again later.",
  });

  /* ── Original implementation (re-enable with Cashfree) ──────────────
  try {
    const { plan } = req.body;
    const userId = req.userId;

    if (plan !== "pro") {
      return res.status(400).json({
        success: false,
        message: "Invalid plan selected",
      });
    }

    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userData = userDoc.data();
    const amount = 699;
    const orderId = `order_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    const request = {
      order_amount: amount,
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: userId,
        customer_email: userData.email,
        customer_name: userData.name,
        customer_phone: "9999999999",
      },
      order_meta: {
        return_url: `${process.env.ALLOWED_ORIGINS?.split(",")[0]}/billing?order_id=${orderId}`,
      },
    };

    const response = await Cashfree.PGCreateOrder("2023-08-01", request);

    await db.collection("billings").add({
      userId,
      amount,
      plan,
      orderId,
      status: "created",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      paymentSessionId: response.data.payment_session_id,
      orderId,
    });
  } catch (error) {
    console.error("Order creation error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Order creation failed",
    });
  }
  ─────────────────────────────────────────────────────────────────── */
};

export const verifyBilling = async (req, res) => {
  return res.status(503).json({
    success: false,
    message:
      "Payment gateway is temporarily unavailable. Please try again later.",
  });

  /* ── Original implementation (re-enable with Cashfree) ──────────────
  try {
    const { orderId } = req.body;
    const userId = req.userId;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Missing order ID",
      });
    }

    const billingSnapshot = await db
      .collection("billings")
      .where("orderId", "==", orderId)
      .limit(1)
      .get();

    if (!billingSnapshot.empty) {
      const billingDoc = billingSnapshot.docs[0];
      if (billingDoc.data().status === "paid") {
        const userDoc = await db.collection("users").doc(userId).get();
        const user = { id: userDoc.id, ...userDoc.data() };

        return res.json({
          success: true,
          message: "Payment already verified",
          user: toSafeUser(user),
        });
      }
    }

    const response = await Cashfree.PGOrderFetchPayments("2023-08-01", orderId);
    const payments = response.data;

    const successfulPayment = payments?.find(
      (p) => p.payment_status === "SUCCESS"
    );

    if (!successfulPayment) {
      if (!billingSnapshot.empty) {
        await billingSnapshot.docs[0].ref.update({
          status: "failed",
          updatedAt: new Date().toISOString(),
        });
      }

      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    if (!billingSnapshot.empty) {
      await billingSnapshot.docs[0].ref.update({
        paymentId: String(successfulPayment.cf_payment_id),
        status: "paid",
        updatedAt: new Date().toISOString(),
      });
    }

    const userRef = db.collection("users").doc(userId);
    await userRef.update({
      plan: "pro",
      proExpiresAt: new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000
      ).toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await userRef.get();
    const user = { id: updatedDoc.id, ...updatedDoc.data() };

    return res.json({
      success: true,
      user: toSafeUser(user),
    });
  } catch (error) {
    console.error("Payment verification error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
  ─────────────────────────────────────────────────────────────────── */
};