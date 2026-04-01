// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        console.log("Incoming portal session request");
        const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");

        if (!stripeSecret) {
            throw new Error("Missing STRIPE_SECRET_KEY");
        }

        const stripe = new Stripe(stripeSecret, {
            apiVersion: "2023-10-16",
        });

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            throw new Error("Missing Supabase environment variables");
        }

        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        const body = await req.json();
        console.log("Request body:", body);

        const { vendorId } = body;

        if (!vendorId) {
            return new Response(
                JSON.stringify({ error: "Missing vendorId" }),
                {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        const { data: vendor, error: vendorError } = await supabase
            .from("vendors")
            .select("stripe_customer_id")
            .eq("id", vendorId)
            .maybeSingle();

        console.log("Vendor fetch result:", vendor, vendorError);

        if (vendorError) {
            throw new Error(vendorError.message);
        }

        if (!vendor?.stripe_customer_id) {
            return new Response(
                JSON.stringify({ error: "No Stripe customer found for this vendor" }),
                {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: vendor.stripe_customer_id,
            return_url: "https://bitebeacon.uk",
        });

        return new Response(JSON.stringify({ url: session.url }), {
            status: 200,
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
            },
        });
    } catch (error) {
        console.error("Portal session error:", error);
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
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
});