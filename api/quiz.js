module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { prompt } = req.body;

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: "서버에 GEMINI_API_KEY가 설정되지 않았습니다." });
    }

    const requestBody = {
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      throw new Error(data.error?.message || "Gemini API 호출 중 오류가 발생했습니다.");
    }

    const responseText = data.candidates[0].content.parts[0].text;

    return res.status(200).json({ response: responseText });
  } catch (error) {
    console.error("Quiz Function error:", error);
    return res.status(500).json({ error: error.message });
  }
};
