import OpenAI from 'openai';

let openaiClient = null;

function getClient(apiKey) {
  if (!openaiClient && apiKey) {
    openaiClient = new OpenAI({apiKey});
  }
  return openaiClient;
}

const EMPTY_INTENT = {keywords: '', alternativeKeywords: [], filters: {}};

/**
 * Extracts structured search intent from a natural language query.
 * Returns concrete product-name keywords suitable for title matching.
 */
export async function extractSearchIntent(query, apiKey) {
  const client = getClient(apiKey);
  if (!client) return {...EMPTY_INTENT, keywords: query};

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 120,
      messages: [
        {
          role: 'system',
          content:
            'Extract shopping search terms from the query. The store sells apparel, shoes & accessories (hoodies, t-shirts, crewnecks, sweatpants, sneakers, beanies, jackets, sunglasses). Return JSON: {"keywords":"<1-2 concrete product words>","alternativeKeywords":["<alt1>","<alt2>"]}. Translate intent into product names—never use abstract words like "warm" or "gift".',
        },
        {role: 'user', content: query},
      ],
      response_format: {type: 'json_object'},
    });

    const r = JSON.parse(completion.choices[0].message.content);
    return {
      keywords: r.keywords || query,
      alternativeKeywords: r.alternativeKeywords || [],
      filters: {},
    };
  } catch (error) {
    console.error('OpenAI extractSearchIntent error:', error);
    return {...EMPTY_INTENT, keywords: query};
  }
}

/**
 * Generates a brief conversational summary for search results.
 */
export async function generateSearchSummary(query, products, apiKey) {
  const client = getClient(apiKey);
  if (!client || !products?.length) return null;

  try {
    const productList = products.slice(0, 6).map((p) => p.title);

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 120,
      messages: [
        {
          role: 'system',
          content:
            'You are a friendly shopping assistant. Given the search query and product names, write 2 short sentences: acknowledge what they want, highlight 1-2 standout products. No markdown.',
        },
        {
          role: 'user',
          content: `"${query}" → ${productList.join(', ')}`,
        },
      ],
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI generateSearchSummary error:', error);
    return null;
  }
}
