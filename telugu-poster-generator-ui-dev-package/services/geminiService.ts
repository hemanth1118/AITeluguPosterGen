
import { GoogleGenAI, GenerateImagesResponse, GenerateContentResponse } from "@google/genai";
import type { LanguagePreference } from '../App'; // Import type

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This error will be caught by the main application loading script or environment setup.
  // If the app still runs, it means API_KEY was somehow set post-build, which is not typical for client-side.
  console.error(
    "CRITICAL: API_KEY for Gemini is not set in environment variables. " +
    "The AI Poster Generator cannot function without it. " +
    "Please ensure the API_KEY environment variable is correctly configured before building/running the application."
  );
  // No need to throw here as the assignment to ai would fail or subsequent calls would fail.
  // Let the app try to initialize; if API_KEY is truly missing, GoogleGenAI constructor or calls will fail.
}

const ai = new GoogleGenAI({ apiKey: API_KEY! }); // Use non-null assertion if confident API_KEY is set by build/env

export interface PosterDetails {
  theme: string;
  englishText: string;
  teluguText: string;
}

export const summarizePromptForTitle = async (userPrompt: string): Promise<string> => {
  if (!userPrompt || userPrompt.trim().length === 0) {
    return "";
  }
  try {
    console.log("Gemini Service: Summarizing prompt for title:", userPrompt.substring(0, 100) + "...");
    const instruction = `Given the user's request: "${userPrompt}", provide a very short title (2-5 words maximum) that accurately summarizes the main subject, product, or theme. This title will be used to name a chat session. 
    Do not use quotation marks in the output.
    Examples:
    - User request: "I need a poster for Ugadi festival with traditional elements"
      Title: "Ugadi Festival Poster"
    - User request: "Create an advertisement for my new bakery 'Sweet Delights', featuring cupcakes and coffee"
      Title: "Sweet Delights Bakery"
    - User request: "A motivational quote about perseverance for students"
      Title: "Perseverance Quote"
    - User request: "Sci-fi movie poster, 'Cybernetic Future'"
      Title: "Cybernetic Future Movie"

    Return ONLY the short title text. No extra explanations or formatting.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: instruction,
        config: {
            // Not using JSON mode as we just need a short string.
            // Keep thinkingConfig default for quality.
        }
    });

    const title = response.text.trim();
    console.log("Gemini Service: Summarized title received:", title);
    // Basic validation, remove quotes if AI adds them
    return title.replace(/^["']|["']$/g, ''); 

  } catch (error) {
    console.error('Gemini API error in summarizePromptForTitle:', error);
    // Don't throw here, let the caller decide how to handle a missing title.
    // Return an empty string or a generic fallback if preferred.
    return ""; // Fallback to empty if summarization fails
  }
};


export const extractPosterDetailsFromPrompt = async (userPrompt: string, languagePreference: LanguagePreference): Promise<PosterDetails> => {
  try {
    console.log(`Gemini Service: Sending user idea for creative poster content generation (Lang: ${languagePreference}):`, userPrompt.substring(0,150) + "...");
    
    let englishInstruction = `Based on the user's idea, *creatively compose* a concise and impactful English message suitable for the poster.
    This message should capture the essence of the user's request. It should NOT be a direct copy of the user's input unless the input itself is already perfect poster copy.
    If the user's idea is "Happy Ugadi poster for friends", you might generate "Wishing You a Joyous Ugadi!".
    If the user's idea is "promote my new coffee shop, 'The Daily Grind'", you might generate "The Daily Grind: Your Perfect Brew Awaits!"
    If the user mentions specific names or attributions (e.g., "quote of the day by Hemanth"), incorporate them naturally into the generated text if appropriate for a poster (e.g., as an attribution like " - A thought by Hemanth").
    If no clear textual direction is given but a theme is present (e.g., "serene beach sunset"), generate a short, fitting evocative phrase.
    If the user's intent is purely visual and no text makes sense, return an empty string.`;

    let teluguInstruction = `Based on the user's idea, *creatively compose* a concise and impactful Telugu message suitable for the poster.
    This message should be a culturally relevant and natural-sounding equivalent or complement to the \`englishText\`, or stand alone if \`englishText\` is empty. It's not just a literal translation of \`englishText\` but a creative piece in its own right, fitting the theme.
    For "Happy Ugadi poster for friends", you might generate "మీకు ఉగాది శుభాకాంక్షలు!"
    If \`englishText\` is generated as "The Daily Grind: Your Perfect Brew Awaits!", you could generate "ది డైలీ గ్రైండ్: మీ రోజుకు సరికొత్త ఆరంభం!"
    If the user mentions specific names or attributions, incorporate them naturally if appropriate.
    If the user's intent is purely visual and no text makes sense, or if Telugu text is not appropriate for the user's idea, return an empty string.`;

    if (languagePreference === 'english') {
      teluguInstruction = "The user has requested English text ONLY for the poster. Therefore, for 'teluguText', you MUST return an empty string. Do not generate any Telugu content.";
    } else if (languagePreference === 'telugu') {
      englishInstruction = "The user has requested Telugu text ONLY for the poster. Therefore, for 'englishText', you MUST return an empty string. Do not generate any English content.";
    }
    // If 'both', instructions remain as defined above.

    const instruction = `Analyze the following user's idea for a poster: "${userPrompt}"

Your task is to act as a creative assistant. Based on the user's idea and their specified language preference, generate compelling content for a poster and a description of the visual theme.
Provide a JSON object with three keys: "theme", "englishText", and "teluguText".

1.  **theme**:
    *   This field is CRITICAL. It must describe ONLY the PURELY VISUAL elements for a background image.
    *   It should detail imagery, colors, artistic style, mood, objects, patterns, and scenery inspired by the user's idea.
    *   It MUST NOT, under any circumstances, include any words, phrases, or text snippets that are intended to be *displayed* on the poster as overlay text. The text content will be handled by 'englishText' and 'teluguText'.
    *   The 'theme' is for visual inspiration for an image model that is explicitly instructed NOT to render any text itself.
    *   If the user's prompt consists *primarily* of text they want inspiration from (e.g., "My Company Logo text and tagline text"), the theme should be generic and focus on abstract backgrounds, corporate aesthetics, or suitable color palettes, NOT the text itself.
    *   If the request is general (e.g., "a cool poster"), infer a suitable abstract visual theme based on current trends or a positive sentiment.

2.  **englishText**:
    *   ${englishInstruction}

3.  **teluguText**:
    *   ${teluguInstruction}

Return ONLY a valid JSON object. Ensure all values are strings.

Example 1 (Preference: 'both'):
User idea: "Sankranti festival wishes for everyone"
JSON response:
{
  "theme": "Vibrant Sankranti festival imagery: kites, sugarcane, traditional Indian decorations, bright festive colors, sunny atmosphere",
  "englishText": "Happy Sankranti to All!",
  "teluguText": "అందరికీ సంక్రాంతి శుభాకాంక్షలు!"
}

Example 2 (Preference: 'english'):
User idea: "Poster for a new scifi movie called 'Cyber Dawn'"
JSON response:
{
  "theme": "Futuristic cityscape at dawn, neon lights, advanced technology, spaceships, mysterious atmosphere, elements of cybernetics",
  "englishText": "Cyber Dawn: The Future Begins Now.",
  "teluguText": ""
}

Example 3 (Preference: 'telugu'):
User idea: "Motivational quote about strength, by Winston Churchill"
JSON response:
{
  "theme": "Imagery conveying strength and resilience: mountains, an oak tree, a lion, or abstract powerful visuals. Colors could be strong and earthy or bold and inspiring.",
  "englishText": "",
  "teluguText": "విజయం అంతిమం కాదు, వైఫల్యం ప్రాణాంతకం కాదు: కొనసాగించే ధైర్యమే ముఖ్యం. - విన్‌స్టన్ చర్చిల్"
}

Example 4 (Preference: 'both', but visual focus):
User idea: "Just a beautiful abstract blue and gold background for meditation."
JSON response:
{
  "theme": "Abstract design featuring flowing blue and gold colors, elegant patterns, possibly with a sense of depth or texture, evoking peace and tranquility",
  "englishText": "",
  "teluguText": ""
}
`;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: instruction,
        config: {
            responseMimeType: "application/json",
        }
    });
    
    console.log("Gemini Service: Raw response for creative content generation received.");
    let jsonStr = response.text.trim();
    
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    try {
      const parsedData = JSON.parse(jsonStr);
      if (typeof parsedData.theme !== 'string' || typeof parsedData.englishText !== 'string' || typeof parsedData.teluguText !== 'string') {
        console.error('Gemini Service: Parsed JSON does not have the expected structure for creative content:', parsedData);
        throw new Error('AI failed to provide poster content in the correct format. Try rephrasing your idea.');
      }

      // Validate based on language preference
      if (languagePreference === 'english' && parsedData.teluguText !== "") {
        console.warn("Gemini Service: AI returned Telugu text when English only was requested. Overriding to empty string.", parsedData);
        parsedData.teluguText = "";
      }
      if (languagePreference === 'telugu' && parsedData.englishText !== "") {
         console.warn("Gemini Service: AI returned English text when Telugu only was requested. Overriding to empty string.", parsedData);
        parsedData.englishText = "";
      }


      console.log("Gemini Service: Parsed creative poster content:", parsedData);
      return parsedData as PosterDetails;
    } catch (e) {
      console.error('Gemini Service: Failed to parse JSON response for creative content:', jsonStr, e);
      throw new Error('AI response for poster content was not valid JSON. Please try again.');
    }

  } catch (error) {
    console.error('Gemini API error in extractPosterDetailsFromPrompt:', error);
    if (error instanceof Error) {
        if (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID") || error.message.includes("permission to access project") || error.message.toLowerCase().includes("api key")) {
            throw new Error("Invalid or incorrectly configured Gemini API Key. Please check your key, its permissions, and ensure it's correctly set in the environment variables.");
        }
        throw new Error(`Gemini API failed during creative content generation: ${error.message}`);
    }
    throw new Error('An unknown error occurred while contacting the Gemini API for creative content generation.');
  }
};


export const generateImageWithGemini = async (prompt: string): Promise<string> => {
  try {
    console.log("Gemini Service: Sending prompt for image generation:", prompt.substring(0, 100) + "...");
    const response: GenerateImagesResponse = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002', 
      prompt: prompt,
      config: { 
        numberOfImages: 1,
        outputMimeType: 'image/png',
      },
    });
    console.log("Gemini Service: Response received from image generation API.");

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image?.imageBytes) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      console.log("Gemini Service: Image data received, length:", base64ImageBytes.length);
      return `data:image/png;base64,${base64ImageBytes}`;
    } else {
      console.error('Gemini Service: No image data in response or unexpected response structure:', response);
      throw new Error('No image was generated by the API, or the response was empty.');
    }
  } catch (error) {
    console.error('Gemini API error in generateImageWithGemini service:', error);
    if (error instanceof Error) {
        if (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID") || error.message.includes("permission to access project") || error.message.toLowerCase().includes("api key")) {
            throw new Error("Invalid or incorrectly configured Gemini API Key. Please check your key, its permissions, and ensure it's correctly set in the environment variables.");
        }
        throw new Error(`Gemini API failed during image generation: ${error.message}`);
    }
    throw new Error('An unknown error occurred while contacting the Gemini API for image generation.');
  }
};