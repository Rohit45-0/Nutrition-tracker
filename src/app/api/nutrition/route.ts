import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = 'gpt-4o-mini';
const MAX_IMAGE_DATA_URL_LENGTH = 5_000_000;

interface NutritionResponseItem {
    name: string;
    quantity: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
}

interface NutritionApiResult {
    items: NutritionResponseItem[];
}

const IMAGE_SYSTEM_PROMPT = `You are a nutrition expert specializing in Indian and global food. Analyze the food photo and estimate nutrition for the visible edible items.

Return ONLY a JSON array of objects with these fields:
- name: food item name (string)
- quantity: visible estimated quantity with unit (string)
- calories: total kcal (number)
- protein: grams (number)
- carbs: grams (number)
- fat: grams (number)
- fiber: grams (number)

Rules:
- Estimate practical serving portions from the image; use "estimated" in the quantity when needed.
- If multiple foods are visible, return one object per food item.
- Do not include plates, utensils, hands, packaging, or non-food objects.
- Do not invent hidden ingredients. Account for typical oil/ghee only when the food visibly or normally contains it.
- If you cannot identify any food, return [].
- Return ONLY valid JSON array, no markdown, no explanation.`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null) as {
            foodText?: unknown;
            imageDataUrl?: unknown;
        } | null;

        if (!body || typeof body !== 'object') {
            return NextResponse.json(
                { error: 'Please provide a meal to analyze' },
                { status: 400 }
            );
        }

        const foodText = typeof body.foodText === 'string' ? body.foodText.trim() : '';
        const imageDataUrl = typeof body.imageDataUrl === 'string' ? body.imageDataUrl.trim() : '';

        if (imageDataUrl) {
            const imageError = validateImageDataUrl(imageDataUrl);
            if (imageError) {
                return NextResponse.json({ error: imageError }, { status: 400 });
            }

            if (!hasUsableOpenAiKey()) {
                return NextResponse.json(
                    { error: 'Photo analysis needs OpenAI. Please type the meal instead.' },
                    { status: 503 }
                );
            }

            try {
                const items = await analyzeImageWithOpenAi(imageDataUrl);
                return NextResponse.json({ items });
            } catch (error) {
                console.error('OpenAI image nutrition error:', error);
                return NextResponse.json(
                    { error: 'I could not read that photo. Try another angle or type the meal.' },
                    { status: 502 }
                );
            }
        }

        if (!foodText || typeof foodText !== 'string') {
            return NextResponse.json(
                { error: 'Please provide food items text' },
                { status: 400 }
            );
        }

        if (!hasUsableOpenAiKey()) {
            // Fallback: use the Indian food database
            return NextResponse.json(await getFallbackNutrition(foodText));
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: `You are a nutrition expert specializing in Indian food. Given food items and quantities, return ONLY a JSON array of objects with these fields:
- name: food item name (string)
- quantity: quantity with unit (string) 
- calories: total kcal (number)
- protein: grams (number)
- carbs: grams (number)
- fat: grams (number)
- fiber: grams (number)

Be accurate with Indian food portions. Common Indian quantities:
- 1 roti/chapati ≈ 30g
- 1 katori/bowl rice ≈ 150g cooked
- 1 katori dal ≈ 150ml
- 1 glass milk ≈ 200ml
- 1 paratha ≈ 50g
- 1 dosa ≈ 40g batter
- 1 idli ≈ 40g
- 1 scoop whey protein ≈ 30g

Return ONLY valid JSON array, no markdown, no explanation.`,
                    },
                    {
                        role: 'user',
                        content: foodText,
                    },
                ],
                temperature: 0.3,
                max_tokens: 500,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('OpenAI API error:', errorData);
            // Fallback to local database
            return NextResponse.json(await getFallbackNutrition(foodText));
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '[]';

        // Parse the JSON response
        let items;
        try {
            // Remove any markdown code block markers
            const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
            items = JSON.parse(cleaned);
        } catch {
            console.error('Failed to parse GPT response:', content);
            return NextResponse.json(await getFallbackNutrition(foodText));
        }

        // Validate and format items
        const formattedItems = (Array.isArray(items) ? items : [items]).map((item: Record<string, unknown>) => ({
            name: String(item.name || 'Unknown food'),
            quantity: String(item.quantity || '1 serving'),
            calories: Math.round(Number(item.calories) || 0),
            protein: Math.round(Number(item.protein) || 0),
            carbs: Math.round(Number(item.carbs) || 0),
            fat: Math.round(Number(item.fat) || 0),
            fiber: Math.round(Number(item.fiber) || 0),
        }));

        return NextResponse.json({ items: formattedItems });
    } catch (error) {
        console.error('Nutrition API error:', error);
        return NextResponse.json(
            { error: 'Failed to get nutrition info' },
            { status: 500 }
        );
    }
}

function hasUsableOpenAiKey() {
    return Boolean(OPENAI_API_KEY && OPENAI_API_KEY !== 'your_openai_api_key_here');
}

function validateImageDataUrl(imageDataUrl: string) {
    if (imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
        return 'Photo is too large. Please try a smaller photo.';
    }

    if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(imageDataUrl)) {
        return 'Please upload a PNG, JPG, JPEG, or WEBP photo.';
    }

    return '';
}

async function analyzeImageWithOpenAi(imageDataUrl: string): Promise<NutritionResponseItem[]> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: IMAGE_SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Estimate nutrition for the visible food in this photo. The user will review before saving.',
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageDataUrl,
                                detail: 'low',
                            },
                        },
                    ],
                },
            ],
            temperature: 0.2,
            max_tokens: 650,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI image API error:', errorData);
        throw new Error('OpenAI image request failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    return formatNutritionItems(parseOpenAiJson(content));
}

function parseOpenAiJson(content: string) {
    const cleaned = content.replace(/```json\s*|\s*```/g, '').trim();

    try {
        return JSON.parse(cleaned);
    } catch {
        const arrayMatch = cleaned.match(/\[[\s\S]*\]/);

        if (arrayMatch) {
            return JSON.parse(arrayMatch[0]);
        }

        console.error('Failed to parse GPT response:', content);
        throw new Error('OpenAI returned invalid JSON');
    }
}

function formatNutritionItems(items: unknown): NutritionResponseItem[] {
    const candidate = items && typeof items === 'object' && !Array.isArray(items) && 'items' in items
        ? (items as { items?: unknown }).items
        : items;
    const list = Array.isArray(candidate) ? candidate : [candidate];

    return list
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item) => ({
            name: String(item.name || 'Unknown food'),
            quantity: String(item.quantity || '1 serving'),
            calories: Math.round(Number(item.calories) || 0),
            protein: Math.round(Number(item.protein) || 0),
            carbs: Math.round(Number(item.carbs) || 0),
            fat: Math.round(Number(item.fat) || 0),
            fiber: Math.round(Number(item.fiber) || 0),
        }));
}

// Extensive Indian food database for fallback
interface FoodData {
    quantity: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
}

const indianFoodDB: Record<string, FoodData> = {
    // Eggs & Dairy
    'egg': { quantity: '1 whole', calories: 78, protein: 6, carbs: 1, fat: 5, fiber: 0 },
    'boiled egg': { quantity: '1 whole', calories: 78, protein: 6, carbs: 1, fat: 5, fiber: 0 },
    'omelette': { quantity: '2 eggs', calories: 190, protein: 13, carbs: 2, fat: 15, fiber: 0 },
    'paneer': { quantity: '100g', calories: 265, protein: 18, carbs: 4, fat: 20, fiber: 0 },
    'curd': { quantity: '1 bowl (200g)', calories: 120, protein: 6, carbs: 8, fat: 7, fiber: 0 },
    'dahi': { quantity: '1 bowl (200g)', calories: 120, protein: 6, carbs: 8, fat: 7, fiber: 0 },
    'yogurt': { quantity: '1 bowl (200g)', calories: 120, protein: 6, carbs: 8, fat: 7, fiber: 0 },
    'milk': { quantity: '1 glass (200ml)', calories: 120, protein: 6, carbs: 10, fat: 6, fiber: 0 },
    'lassi': { quantity: '1 glass', calories: 160, protein: 5, carbs: 22, fat: 5, fiber: 0 },
    'chaas': { quantity: '1 glass', calories: 40, protein: 2, carbs: 4, fat: 2, fiber: 0 },
    'buttermilk': { quantity: '1 glass', calories: 40, protein: 2, carbs: 4, fat: 2, fiber: 0 },
    'cheese': { quantity: '1 slice (20g)', calories: 68, protein: 4, carbs: 1, fat: 6, fiber: 0 },
    'ghee': { quantity: '1 tbsp', calories: 120, protein: 0, carbs: 0, fat: 14, fiber: 0 },

    // Breads
    'roti': { quantity: '1 piece', calories: 104, protein: 3, carbs: 18, fat: 3, fiber: 2 },
    'chapati': { quantity: '1 piece', calories: 104, protein: 3, carbs: 18, fat: 3, fiber: 2 },
    'paratha': { quantity: '1 piece', calories: 200, protein: 4, carbs: 28, fat: 8, fiber: 2 },
    'aloo paratha': { quantity: '1 piece', calories: 250, protein: 5, carbs: 35, fat: 10, fiber: 3 },
    'gobi paratha': { quantity: '1 piece', calories: 220, protein: 5, carbs: 30, fat: 9, fiber: 3 },
    'naan': { quantity: '1 piece', calories: 260, protein: 6, carbs: 40, fat: 8, fiber: 2 },
    'butter naan': { quantity: '1 piece', calories: 310, protein: 6, carbs: 40, fat: 14, fiber: 2 },
    'puri': { quantity: '1 piece', calories: 120, protein: 2, carbs: 14, fat: 6, fiber: 1 },
    'bhatura': { quantity: '1 piece', calories: 250, protein: 5, carbs: 30, fat: 12, fiber: 1 },
    'bread': { quantity: '1 slice', calories: 80, protein: 3, carbs: 14, fat: 1, fiber: 1 },
    'toast': { quantity: '1 slice', calories: 80, protein: 3, carbs: 14, fat: 1, fiber: 1 },

    // Rice & Grains
    'rice': { quantity: '1 bowl (150g cooked)', calories: 195, protein: 4, carbs: 43, fat: 0, fiber: 1 },
    'brown rice': { quantity: '1 bowl (150g cooked)', calories: 170, protein: 4, carbs: 36, fat: 1, fiber: 3 },
    'biryani': { quantity: '1 plate', calories: 450, protein: 18, carbs: 55, fat: 18, fiber: 2 },
    'chicken biryani': { quantity: '1 plate', calories: 500, protein: 25, carbs: 55, fat: 20, fiber: 2 },
    'pulao': { quantity: '1 bowl', calories: 250, protein: 5, carbs: 42, fat: 7, fiber: 2 },
    'khichdi': { quantity: '1 bowl', calories: 200, protein: 8, carbs: 35, fat: 4, fiber: 3 },
    'poha': { quantity: '1 plate', calories: 250, protein: 5, carbs: 40, fat: 8, fiber: 2 },
    'upma': { quantity: '1 bowl', calories: 220, protein: 5, carbs: 35, fat: 7, fiber: 2 },
    'oats': { quantity: '1 bowl (40g)', calories: 150, protein: 5, carbs: 27, fat: 3, fiber: 4 },
    'daliya': { quantity: '1 bowl', calories: 180, protein: 6, carbs: 32, fat: 3, fiber: 5 },

    // Dal & Lentils
    'dal': { quantity: '1 bowl', calories: 180, protein: 12, carbs: 28, fat: 3, fiber: 5 },
    'toor dal': { quantity: '1 bowl', calories: 180, protein: 12, carbs: 28, fat: 3, fiber: 5 },
    'moong dal': { quantity: '1 bowl', calories: 160, protein: 14, carbs: 24, fat: 2, fiber: 4 },
    'chana dal': { quantity: '1 bowl', calories: 200, protein: 14, carbs: 30, fat: 4, fiber: 6 },
    'masoor dal': { quantity: '1 bowl', calories: 170, protein: 13, carbs: 26, fat: 2, fiber: 5 },
    'rajma': { quantity: '1 bowl', calories: 220, protein: 13, carbs: 35, fat: 3, fiber: 8 },
    'chole': { quantity: '1 bowl', calories: 240, protein: 12, carbs: 35, fat: 6, fiber: 7 },
    'chana': { quantity: '1 bowl', calories: 240, protein: 12, carbs: 35, fat: 6, fiber: 7 },
    'sambar': { quantity: '1 bowl', calories: 140, protein: 8, carbs: 20, fat: 3, fiber: 4 },
    'rasam': { quantity: '1 bowl', calories: 60, protein: 2, carbs: 10, fat: 1, fiber: 1 },

    // South Indian
    'dosa': { quantity: '1 piece', calories: 120, protein: 3, carbs: 18, fat: 4, fiber: 1 },
    'masala dosa': { quantity: '1 piece', calories: 250, protein: 5, carbs: 32, fat: 12, fiber: 2 },
    'idli': { quantity: '1 piece', calories: 60, protein: 2, carbs: 12, fat: 0, fiber: 1 },
    'vada': { quantity: '1 piece', calories: 150, protein: 5, carbs: 15, fat: 8, fiber: 2 },
    'uttapam': { quantity: '1 piece', calories: 200, protein: 5, carbs: 28, fat: 8, fiber: 2 },
    'pongal': { quantity: '1 bowl', calories: 220, protein: 6, carbs: 35, fat: 6, fiber: 3 },
    'appam': { quantity: '1 piece', calories: 120, protein: 2, carbs: 22, fat: 3, fiber: 1 },

    // Vegetables
    'sabzi': { quantity: '1 bowl', calories: 120, protein: 3, carbs: 15, fat: 5, fiber: 4 },
    'aloo': { quantity: '1 bowl', calories: 160, protein: 3, carbs: 30, fat: 5, fiber: 3 },
    'palak paneer': { quantity: '1 bowl', calories: 280, protein: 14, carbs: 10, fat: 20, fiber: 3 },
    'aloo gobi': { quantity: '1 bowl', calories: 150, protein: 4, carbs: 20, fat: 6, fiber: 4 },
    'bhindi': { quantity: '1 bowl', calories: 100, protein: 3, carbs: 12, fat: 5, fiber: 4 },
    'baingan': { quantity: '1 bowl', calories: 130, protein: 3, carbs: 15, fat: 7, fiber: 4 },
    'mixed veg': { quantity: '1 bowl', calories: 120, protein: 4, carbs: 18, fat: 4, fiber: 5 },
    'paneer butter masala': { quantity: '1 bowl', calories: 350, protein: 15, carbs: 12, fat: 28, fiber: 2 },
    'salad': { quantity: '1 plate', calories: 50, protein: 2, carbs: 10, fat: 0, fiber: 3 },
    'raita': { quantity: '1 bowl', calories: 80, protein: 3, carbs: 8, fat: 4, fiber: 1 },

    // Non-Veg
    'chicken curry': { quantity: '1 bowl', calories: 280, protein: 28, carbs: 8, fat: 15, fiber: 1 },
    'chicken': { quantity: '100g', calories: 200, protein: 25, carbs: 0, fat: 10, fiber: 0 },
    'chicken breast': { quantity: '100g', calories: 165, protein: 31, carbs: 0, fat: 4, fiber: 0 },
    'tandoori chicken': { quantity: '2 pieces', calories: 260, protein: 30, carbs: 5, fat: 14, fiber: 0 },
    'butter chicken': { quantity: '1 bowl', calories: 380, protein: 24, carbs: 12, fat: 26, fiber: 1 },
    'fish curry': { quantity: '1 bowl', calories: 220, protein: 22, carbs: 8, fat: 12, fiber: 1 },
    'fish': { quantity: '100g', calories: 140, protein: 22, carbs: 0, fat: 6, fiber: 0 },
    'mutton curry': { quantity: '1 bowl', calories: 350, protein: 25, carbs: 10, fat: 24, fiber: 1 },
    'keema': { quantity: '1 bowl', calories: 300, protein: 20, carbs: 8, fat: 22, fiber: 1 },
    'egg curry': { quantity: '2 eggs', calories: 250, protein: 14, carbs: 10, fat: 18, fiber: 1 },

    // Fruits
    'banana': { quantity: '1 medium', calories: 105, protein: 1, carbs: 27, fat: 0, fiber: 3 },
    'apple': { quantity: '1 medium', calories: 95, protein: 0, carbs: 25, fat: 0, fiber: 4 },
    'guava': { quantity: '1 medium', calories: 68, protein: 3, carbs: 14, fat: 1, fiber: 5 },
    'mango': { quantity: '1 medium', calories: 150, protein: 1, carbs: 35, fat: 1, fiber: 3 },
    'papaya': { quantity: '1 bowl', calories: 60, protein: 1, carbs: 15, fat: 0, fiber: 2 },
    'orange': { quantity: '1 medium', calories: 65, protein: 1, carbs: 16, fat: 0, fiber: 3 },
    'pomegranate': { quantity: '1 bowl', calories: 83, protein: 2, carbs: 19, fat: 1, fiber: 4 },
    'watermelon': { quantity: '1 bowl', calories: 46, protein: 1, carbs: 12, fat: 0, fiber: 1 },
    'chiku': { quantity: '1 medium', calories: 80, protein: 1, carbs: 20, fat: 1, fiber: 5 },
    'grapes': { quantity: '1 bowl', calories: 70, protein: 1, carbs: 18, fat: 0, fiber: 1 },

    // Protein supplements  
    'protein scoop': { quantity: '1 scoop (30g)', calories: 120, protein: 24, carbs: 3, fat: 1, fiber: 0 },
    'whey protein': { quantity: '1 scoop (30g)', calories: 120, protein: 24, carbs: 3, fat: 1, fiber: 0 },
    'protein shake': { quantity: '1 serving', calories: 150, protein: 25, carbs: 5, fat: 2, fiber: 0 },
    'protein bar': { quantity: '1 bar', calories: 200, protein: 20, carbs: 22, fat: 7, fiber: 3 },

    // Snacks
    'samosa': { quantity: '1 piece', calories: 250, protein: 4, carbs: 28, fat: 14, fiber: 2 },
    'pakora': { quantity: '5 pieces', calories: 200, protein: 4, carbs: 20, fat: 12, fiber: 2 },
    'bhel puri': { quantity: '1 plate', calories: 200, protein: 5, carbs: 30, fat: 7, fiber: 3 },
    'pani puri': { quantity: '6 pieces', calories: 180, protein: 3, carbs: 30, fat: 6, fiber: 2 },
    'dhokla': { quantity: '4 pieces', calories: 160, protein: 5, carbs: 24, fat: 5, fiber: 2 },
    'kachori': { quantity: '1 piece', calories: 200, protein: 4, carbs: 22, fat: 11, fiber: 2 },
    'mathri': { quantity: '4 pieces', calories: 180, protein: 3, carbs: 18, fat: 11, fiber: 1 },
    'namkeen': { quantity: '1 bowl', calories: 200, protein: 5, carbs: 22, fat: 11, fiber: 2 },
    'biscuit': { quantity: '2 pieces', calories: 80, protein: 1, carbs: 12, fat: 3, fiber: 0 },

    // Nuts & Dry Fruits
    'almonds': { quantity: '10 pieces', calories: 70, protein: 3, carbs: 2, fat: 6, fiber: 1 },
    'cashew': { quantity: '10 pieces', calories: 90, protein: 3, carbs: 5, fat: 7, fiber: 0 },
    'peanuts': { quantity: '1 handful (30g)', calories: 170, protein: 7, carbs: 5, fat: 14, fiber: 2 },
    'walnuts': { quantity: '5 halves', calories: 65, protein: 2, carbs: 1, fat: 7, fiber: 1 },
    'dates': { quantity: '2 pieces', calories: 56, protein: 0, carbs: 15, fat: 0, fiber: 2 },
    'raisins': { quantity: '1 tbsp', calories: 42, protein: 0, carbs: 11, fat: 0, fiber: 1 },
    'dry fruits mix': { quantity: '1 handful (30g)', calories: 150, protein: 4, carbs: 10, fat: 11, fiber: 2 },

    // Beverages
    'tea': { quantity: '1 cup', calories: 30, protein: 1, carbs: 5, fat: 1, fiber: 0 },
    'chai': { quantity: '1 cup', calories: 50, protein: 2, carbs: 7, fat: 2, fiber: 0 },
    'coffee': { quantity: '1 cup', calories: 30, protein: 1, carbs: 4, fat: 1, fiber: 0 },
    'green tea': { quantity: '1 cup', calories: 2, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    'coconut water': { quantity: '1 glass', calories: 45, protein: 2, carbs: 9, fat: 0, fiber: 0 },
    'mango shake': { quantity: '1 glass', calories: 200, protein: 5, carbs: 35, fat: 5, fiber: 1 },
    'banana shake': { quantity: '1 glass', calories: 180, protein: 6, carbs: 30, fat: 4, fiber: 2 },
    'nimbu pani': { quantity: '1 glass', calories: 40, protein: 0, carbs: 10, fat: 0, fiber: 0 },
    'sugarcane juice': { quantity: '1 glass', calories: 180, protein: 0, carbs: 45, fat: 0, fiber: 0 },

    // Sweets & Desserts
    'gulab jamun': { quantity: '2 pieces', calories: 300, protein: 3, carbs: 40, fat: 14, fiber: 0 },
    'rasgulla': { quantity: '2 pieces', calories: 190, protein: 4, carbs: 35, fat: 4, fiber: 0 },
    'jalebi': { quantity: '2 pieces', calories: 250, protein: 2, carbs: 40, fat: 10, fiber: 0 },
    'ladoo': { quantity: '1 piece', calories: 180, protein: 3, carbs: 25, fat: 8, fiber: 1 },
    'halwa': { quantity: '1 bowl', calories: 250, protein: 3, carbs: 35, fat: 12, fiber: 1 },
    'barfi': { quantity: '1 piece', calories: 150, protein: 3, carbs: 20, fat: 7, fiber: 0 },
    'kheer': { quantity: '1 bowl', calories: 200, protein: 5, carbs: 32, fat: 6, fiber: 0 },
};

/**
 * Fallback nutrition lookup using local Indian food database
 */
async function getFallbackNutrition(foodText: string): Promise<NutritionApiResult> {
    const text = foodText.toLowerCase().trim();

    // Try to parse items like "2 eggs, 1 banana, 1 protein scoop"
    const parts = text.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);

    const items = parts.map((part) => {
        // Extract quantity number
        const numMatch = part.match(/^(\d+\.?\d*)\s+/);
        const qty = numMatch ? parseFloat(numMatch[1]) : 1;
        const foodName = numMatch ? part.replace(numMatch[0], '').trim() : part;

        // Search the database
        let match: FoodData | null = null;
        let matchedName = foodName;

        // Exact match
        if (indianFoodDB[foodName]) {
            match = indianFoodDB[foodName];
            matchedName = foodName;
        } else {
            // Partial match - find best match
            for (const [key, value] of Object.entries(indianFoodDB)) {
                if (foodName.includes(key) || key.includes(foodName)) {
                    match = value;
                    matchedName = key;
                    break;
                }
            }

            // Singular/plural
            if (!match) {
                const singular = foodName.replace(/s$/, '');
                if (indianFoodDB[singular]) {
                    match = indianFoodDB[singular];
                    matchedName = singular;
                }
            }
        }

        if (match) {
            return {
                name: matchedName.charAt(0).toUpperCase() + matchedName.slice(1),
                quantity: `${qty} × ${match.quantity}`,
                calories: Math.round(match.calories * qty),
                protein: Math.round(match.protein * qty),
                carbs: Math.round(match.carbs * qty),
                fat: Math.round(match.fat * qty),
                fiber: Math.round(match.fiber * qty),
            };
        }

        // Unknown food - return generic estimate
        return {
            name: foodName.charAt(0).toUpperCase() + foodName.slice(1),
            quantity: `${qty} serving(s)`,
            calories: Math.round(100 * qty),
            protein: Math.round(3 * qty),
            carbs: Math.round(15 * qty),
            fat: Math.round(3 * qty),
            fiber: Math.round(1 * qty),
        };
    });

    return { items };
}
