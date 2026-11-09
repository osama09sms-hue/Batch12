
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === "/") {
      return response({
        app: "Batch 12 AI Service",
        status: "online"
      });
    }

    if (url.pathname !== "/api/chat") {
      return response({ error: "Not Found" }, 404);
    }

    if (request.method !== "POST") {
      return response({ error: "Method Not Allowed" }, 405);
    }

    if (!env.OPENROUTER_API_KEY) {
      return response({
        error: "AI service is not configured"
      }, 503);
    }

    try {
      const body = await request.json();

      if (!Array.isArray(body.messages) || body.messages.length === 0) {
        return response({ error: "Messages are required" }, 400);
      }

      if (body.messages.length > 30) {
        return response({ error: "Too many messages" }, 400);
      }

      const messages = body.messages.map((item) => {
        if (
          !["user", "assistant"].includes(item.role) ||
          typeof item.content !== "string" ||
          item.content.length > 12000
        ) {
          throw new Error("Invalid message format");
        }

        return {
          role: item.role,
          content: item.content
        };
      });

      const aiResponse = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/osama09sms-hue/Batch12",
            "X-Title": "Batch 12"
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages,
            temperature: 0.5,
            max_tokens: 1500
          })
        }
      );

      const result = await aiResponse.json();

      if (!aiResponse.ok) {
        return response({
          error: "AI provider request failed",
          details: result.error?.message || "Unknown error"
        }, aiResponse.status);
      }

      return response({
        success: true,
        reply: result.choices?.[0]?.message?.content || ""
      });

    } catch (error) {
      return response({
        error: "Request failed",
        details: error.message
      }, 500);
    }
  }
};
