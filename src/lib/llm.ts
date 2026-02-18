/**
 * LLM integration for Hugging Face Inference API or local LMStudio
 * Supports: Hugging Face free tier, LMStudio (localhost)
 */

const HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models";
const LMSTUDIO_URL = "http://localhost:1234/v1";

export type LLMProvider = "huggingface" | "lmstudio";

export interface LLMConfig {
  provider: LLMProvider;
  huggingfaceApiKey?: string;
  model?: string; // For HF: e.g. "mistralai/Mistral-7B-Instruct-v0.2", for LMStudio: model name
}

function getLLMConfig(): LLMConfig {
  if (typeof window === "undefined") {
    return { provider: "huggingface" };
  }
  const stored = localStorage.getItem("linkedin-llm-config");
  if (stored) {
    try {
      return JSON.parse(stored) as LLMConfig;
    } catch {
      // ignore
    }
  }
  return { provider: "huggingface" };
}

export async function generateWithLLM(
  prompt: string,
  maxTokens = 300
): Promise<string> {
  const config = getLLMConfig();

  if (config.provider === "lmstudio") {
    return generateWithLMStudio(prompt, maxTokens, config.model);
  }

  return generateWithHuggingFace(prompt, maxTokens, config);
}

async function generateWithHuggingFace(
  prompt: string,
  maxTokens: number,
  config: LLMConfig
): Promise<string> {
  const apiKey = config.huggingfaceApiKey || process.env.NEXT_PUBLIC_HF_API_KEY;
  const model = config.model || "mistralai/Mistral-7B-Instruct-v0.2";

  if (!apiKey) {
    throw new Error(
      "Hugging Face API key required. Set NEXT_PUBLIC_HF_API_KEY in .env or in Settings."
    );
  }

  const response = await fetch(
    `${HUGGINGFACE_API_URL}/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: maxTokens,
          temperature: 0.7,
          return_full_text: false,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Hugging Face API error: ${response.status} - ${err}`);
  }

  const data = (await response.json()) as
    | { generated_text?: string }
    | Array<{ generated_text: string }>;

  if (Array.isArray(data) && data[0]?.generated_text) {
    return data[0].generated_text.trim();
  }
  if (typeof data === "object" && "generated_text" in data) {
    return (data as { generated_text: string }).generated_text.trim();
  }
  return "";
}

async function generateWithLMStudio(
  prompt: string,
  maxTokens: number,
  model?: string
): Promise<string> {
  const response = await fetch(`${LMSTUDIO_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || "local-model",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `LMStudio error: ${response.status}. Ensure LMStudio is running with a model loaded.`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  return content.trim();
}

export function saveLLMConfig(config: LLMConfig): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("linkedin-llm-config", JSON.stringify(config));
  }
}
