exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { history, message, systemInstruction } = JSON.parse(event.body);

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "서버에 GEMINI_API_KEY가 설정되지 않았습니다." })
      };
    }

    const contents = (history || []).map(m => ({
      role: m.role,
      parts: m.parts
    }));

    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const requestBody = {
      contents: contents,
      systemInstruction: {
        role: "system",
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            response_text: { type: "string" },
            has_error: { type: "boolean" },
            is_fallback: { type: "boolean" },
            is_success: { type: "boolean" },
            correct_answer: { type: "string" },
            hidden_intention: { type: "string" },
            error_sentence: { type: "string" }
          },
          required: ["response_text", "has_error", "is_fallback", "is_success", "correct_answer", "hidden_intention", "error_sentence"]
        }
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent?alt=sse&key=${API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const textData = await response.text();

    return {
      statusCode: response.status,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      body: textData
    };
  } catch (error) {
    console.error("Chat Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
