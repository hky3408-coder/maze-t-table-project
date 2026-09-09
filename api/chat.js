module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { history, message, systemInstruction } = req.body;

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: "서버에 GEMINI_API_KEY가 설정되지 않았습니다." });
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

    const googleRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!googleRes.ok) {
      const errText = await googleRes.text();
      let errMsg = errText;
      try {
        const errObj = JSON.parse(errText);
        errMsg = errObj.error?.message || errText;
      } catch (e) {}
      return res.status(googleRes.status).json({ error: errMsg });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const reader = googleRes.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop(); // Keep incomplete line

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;
          try {
            const parsedChunk = JSON.parse(jsonStr);
            const textPart = parsedChunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (textPart) {
              res.write(`data: ${JSON.stringify({ text: textPart })}\n\n`);
            }
          } catch (e) {}
        }
      }
    }

    if (sseBuffer.trim().startsWith('data:')) {
      const jsonStr = sseBuffer.trim().slice(5).trim();
      try {
        const parsedChunk = JSON.parse(jsonStr);
        const textPart = parsedChunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (textPart) {
          res.write(`data: ${JSON.stringify({ text: textPart })}\n\n`);
        }
      } catch (e) {}
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error("Chat API error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.end();
    }
  }
};
