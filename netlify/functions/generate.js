// Esta função roda no servidor da Netlify, nunca no navegador do visitante.
// A chave GROQ_API_KEY fica guardada nas variáveis de ambiente do site na Netlify,
// então ela nunca aparece no código que as pessoas veem.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  let topic;
  try {
    const body = JSON.parse(event.body || '{}');
    topic = (body.topic || '').trim();
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Corpo da requisição inválido' }) };
  }

  if (!topic) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Tema não informado' }) };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GROQ_API_KEY não configurada nas variáveis de ambiente da Netlify' }) };
  }

  const systemPrompt = `Você é um assistente educacional para estudantes brasileiros. Dado um tema de estudo, pesquise mentalmente o assunto com profundidade e gere material em português do Brasil.
Responda APENAS com um JSON válido, sem markdown, sem crases, sem texto antes ou depois, seguindo exatamente este formato:
{
  "summary": "um resumo aprofundado do tema em 4 a 6 frases, cobrindo os pontos mais importantes",
  "keyPoints": ["ponto-chave curto 1", "ponto-chave curto 2", "ponto-chave curto 3", "ponto-chave curto 4"],
  "slides": [
    {"title": "título curto do slide", "bullets": ["bullet objetivo 1", "bullet objetivo 2", "bullet objetivo 3"]}
  ],
  "questions": [
    {
      "question": "pergunta de múltipla escolha",
      "options": ["opção A", "opção B", "opção C", "opção D"],
      "correctIndex": 0,
      "explanation": "explicação curta de por que essa é a resposta certa"
    }
  ]
}
Regras: gere exatamente 6 itens em "slides" formando uma apresentação progressiva do tema (introdução, desenvolvimento em blocos, conclusão), cada slide com 2 a 4 bullets curtos; exatamente 4 itens em "keyPoints"; exatamente 5 itens em "questions" com exatamente 4 opções cada. Mantenha tudo conciso e correto. Adapte o nível ao ensino médio/vestibular a menos que o tema indique outro nível. Não inclua nada fora do JSON.`;

  try {
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Matéria: ${topic}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      return { statusCode: 502, body: JSON.stringify({ error: `Erro da API do Groq: ${errText}` }) };
    }

    const data = await groqResponse.json();
    const content = data?.choices?.[0]?.message?.content || '{}';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: content
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
