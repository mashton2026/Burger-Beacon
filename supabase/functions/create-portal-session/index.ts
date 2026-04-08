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
        const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!stripeSecret || !supabaseUrl || !supabaseServiceRoleKey) {
            return new Response(
                JSON.stringify({ error: "Missing environment variables" }),
                {
                    status: 500,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        const stripe = new Stripe(stripeSecret, {
            apiVersion: "2023-10-16",
        });

        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            });
        }

        const userClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
            global: {
                headers: {
                    Authorization: authHeader,
                },
            },
        });

        const {
            data: { user },
            error: userError,
        } = await userClient.auth.getUser();

        if (userError || !user) {
            return new Response(JSON.stringify({ error: "Invalid user" }), {
                status: 401,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            });
        }

        const body = await req.json();
        const { vendorId } = body;

        if (!vendorId) {
            return new Response(JSON.stringify({ error: "Missing vendorId" }), {
                status: 400,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            });
        }

        const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

        const { data: vendor, error: vendorError } = await serviceClient
            .from("vendors")
            .select("id, owner_id, stripe_customer_id")
            .eq("id", vendorId)
            .eq("owner_id", user.id)
            .maybeSingle();

        if (vendorError) {
            return new Response(JSON.stringify({ error: vendorError.message }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            });
        }

        if (!vendor) {
            return new Response(
                JSON.stringify({ error: "Unauthorized vendor access" }),
                {
                    status: 403,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        if (!vendor.stripe_customer_id) {
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