// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, stripe-signature",
};

export const config = {
    auth: false,
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
        const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!stripeSecretKey) {
            return new Response("Missing STRIPE_SECRET_KEY", { status: 500 });
        }

        if (!webhookSecret) {
            return new Response("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });
        }

        if (!supabaseUrl || !serviceRoleKey) {
            return new Response(
                "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
                { status: 500 }
            );
        }

        const signature = req.headers.get("stripe-signature");

        if (!signature) {
            return new Response("Missing stripe-signature header", { status: 400 });
        }

        const rawBody = await req.text();

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2023-10-16",
        });

        const event = await stripe.webhooks.constructEventAsync(
            rawBody,
            signature,
            webhookSecret
        );

        console.log("Webhook received:", event.type);

        const supabase = createClient(supabaseUrl, serviceRoleKey);

        if (event.type === "checkout.session.completed") {
            const session = event.data.object;

            const vendorId = session.metadata?.vendorId;
            const tier = session.metadata?.tier;
            const userId = session.metadata?.userId;
            const stripeCustomerId = session.customer;
            const stripeSubscriptionId = session.subscription;

            console.log("Metadata:", {
                vendorId,
                tier,
                userId,
                stripeCustomerId,
                stripeSubscriptionId,
            });

            if (!vendorId || !tier) {
                console.error("Missing metadata on checkout.session.completed");
                return new Response("Missing vendorId or tier metadata", {
                    status: 400,
                });
            }

            const { data, error } = await supabase
                .from("vendors")
                .update({
                    subscription_tier: tier,
                    stripe_customer_id: stripeCustomerId,
                    stripe_subscription_id: stripeSubscriptionId,
                    subscription_status: "active",
                })
                .eq("id", vendorId)
                .select();

            console.log("Update result:", { data, error });

            if (error) {
                console.error("Failed to update vendor:", error);
                return new Response(
                    JSON.stringify({
                        error: "Failed to update vendor",
                        details: error.message,
                    }),
                    {
                        status: 500,
                        headers: {
                            ...corsHeaders,
                            "Content-Type": "application/json",
                        },
                    }
                );
            }

            return new Response(
                JSON.stringify({
                    received: true,
                    updated: true,
                    vendorId,
                    tier,
                    stripeCustomerId,
                    stripeSubscriptionId,
                }),
                {
                    status: 200,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        if (event.type === "invoice.payment_succeeded") {
            const invoice = event.data.object;
            const stripeSubscriptionId = invoice.subscription;

            const { error } = await supabase
                .from("vendors")
                .update({
                    subscription_status: "active",
                })
                .eq("stripe_subscription_id", stripeSubscriptionId);

            if (error) {
                console.error("Failed to mark subscription active:", error);
                return new Response(
                    JSON.stringify({
                        error: "Failed to mark subscription active",
                        details: error.message,
                    }),
                    {
                        status: 500,
                        headers: {
                            ...corsHeaders,
                            "Content-Type": "application/json",
                        },
                    }
                );
            }

            return new Response(
                JSON.stringify({
                    received: true,
                    updated: true,
                    eventType: event.type,
                }),
                {
                    status: 200,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        if (event.type === "invoice.payment_failed") {
            const invoice = event.data.object;
            const stripeSubscriptionId = invoice.subscription;

            const { error } = await supabase
                .from("vendors")
                .update({
                    subscription_status: "past_due",
                })
                .eq("stripe_subscription_id", stripeSubscriptionId);

            if (error) {
                console.error("Failed to mark subscription past_due:", error);
                return new Response(
                    JSON.stringify({
                        error: "Failed to mark subscription past_due",
                        details: error.message,
                    }),
                    {
                        status: 500,
                        headers: {
                            ...corsHeaders,
                            "Content-Type": "application/json",
                        },
                    }
                );
            }

            return new Response(
                JSON.stringify({
                    received: true,
                    updated: true,
                    eventType: event.type,
                }),
                {
                    status: 200,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        if (event.type === "customer.subscription.updated") {
            const subscription = event.data.object;
            const stripeSubscriptionId = subscription.id;

            const updatedPriceId =
                subscription.items?.data?.[0]?.price?.id ?? null;

            let nextTier: "free" | "growth" | "pro" | null = null;

            if (updatedPriceId === "price_1TGMXnPDTRLYMBotypaooxb6") {
                nextTier = "growth";
            }

            if (updatedPriceId === "price_1TGMe2PDTRLYMBotJMfaW1ql") {
                nextTier = "pro";
            }

            if (!nextTier) {
                return new Response(
                    JSON.stringify({
                        received: true,
                        ignored: true,
                        eventType: event.type,
                        reason: "Unknown price ID",
                    }),
                    {
                        status: 200,
                        headers: {
                            ...corsHeaders,
                            "Content-Type": "application/json",
                        },
                    }
                );
            }

            const subscriptionStatus =
                typeof subscription.status === "string"
                    ? subscription.status
                    : "active";

            const { error } = await supabase
                .from("vendors")
                .update({
                    subscription_tier: nextTier,
                    subscription_status: subscriptionStatus,
                    stripe_customer_id: subscription.customer,
                    stripe_subscription_id: stripeSubscriptionId,
                })
                .eq("stripe_subscription_id", stripeSubscriptionId);

            if (error) {
                console.error("Failed to update subscription tier from portal change:", error);
                return new Response(
                    JSON.stringify({
                        error: "Failed to update subscription tier",
                        details: error.message,
                    }),
                    {
                        status: 500,
                        headers: {
                            ...corsHeaders,
                            "Content-Type": "application/json",
                        },
                    }
                );
            }

            return new Response(
                JSON.stringify({
                    received: true,
                    updated: true,
                    eventType: event.type,
                    stripeSubscriptionId,
                    subscriptionTier: nextTier,
                }),
                {
                    status: 200,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        if (event.type === "customer.subscription.deleted") {
            const subscription = event.data.object;
            const stripeSubscriptionId = subscription.id;

            const { error } = await supabase
                .from("vendors")
                .update({
                    subscription_tier: "free",
                    subscription_status: "canceled",
                })
                .eq("stripe_subscription_id", stripeSubscriptionId);

            if (error) {
                console.error("Failed to cancel subscription:", error);
                return new Response(
                    JSON.stringify({
                        error: "Failed to cancel subscription",
                        details: error.message,
                    }),
                    {
                        status: 500,
                        headers: {
                            ...corsHeaders,
                            "Content-Type": "application/json",
                        },
                    }
                );
            }

            return new Response(
                JSON.stringify({
                    received: true,
                    updated: true,
                    eventType: event.type,
                }),
                {
                    status: 200,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        return new Response(
            JSON.stringify({
                received: true,
                ignored: true,
                eventType: event.type,
            }),
            {
                status: 200,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        );
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown webhook error";

        console.error("Stripe webhook error:", message);

        return new Response(
            JSON.stringify({
                error: message,
            }),
            {
                status: 400,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        );
    }
});