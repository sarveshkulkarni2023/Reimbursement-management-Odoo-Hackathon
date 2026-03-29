import { Router } from "express";
import { authenticate } from "../lib/auth";

const router = Router();

// Cache currencies to avoid too many external API calls
let currenciesCache: any[] | null = null;
let cacheExpiry = 0;

router.get("/list", async (_req, res) => {
  try {
    if (currenciesCache && Date.now() < cacheExpiry) {
      res.json(currenciesCache);
      return;
    }

    const response = await fetch("https://restcountries.com/v3.1/all?fields=name,currencies");
    const countries = await response.json();

    const currencyMap = new Map<string, { code: string; name: string; symbol: string }>();

    for (const country of countries) {
      if (country.currencies) {
        for (const [code, details] of Object.entries(country.currencies as Record<string, any>)) {
          if (!currencyMap.has(code)) {
            currencyMap.set(code, {
              code,
              name: details.name || code,
              symbol: details.symbol || code,
            });
          }
        }
      }
    }

    const currencies = Array.from(currencyMap.values()).sort((a, b) => a.code.localeCompare(b.code));
    currenciesCache = currencies;
    cacheExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    res.json(currencies);
  } catch (error) {
    // Fallback to common currencies
    res.json([
      { code: "USD", name: "United States dollar", symbol: "$" },
      { code: "EUR", name: "Euro", symbol: "€" },
      { code: "GBP", name: "British pound", symbol: "£" },
      { code: "INR", name: "Indian rupee", symbol: "₹" },
      { code: "JPY", name: "Japanese yen", symbol: "¥" },
      { code: "CAD", name: "Canadian dollar", symbol: "CA$" },
      { code: "AUD", name: "Australian dollar", symbol: "A$" },
      { code: "CHF", name: "Swiss franc", symbol: "Fr." },
      { code: "CNY", name: "Chinese yuan", symbol: "¥" },
      { code: "SGD", name: "Singapore dollar", symbol: "S$" },
      { code: "AED", name: "UAE dirham", symbol: "د.إ" },
      { code: "SAR", name: "Saudi riyal", symbol: "﷼" },
    ]);
  }
});

// Exchange rate cache
const exchangeRateCache = new Map<string, { rates: Record<string, number>; expiry: number }>();

router.get("/convert", authenticate, async (req, res) => {
  const { from, to, amount } = req.query;

  if (!from || !to || !amount) {
    res.status(400).json({ error: "from, to, and amount are required" });
    return;
  }

  const amountNum = parseFloat(amount as string);
  if (isNaN(amountNum)) {
    res.status(400).json({ error: "Invalid amount" });
    return;
  }

  const fromCurrency = (from as string).toUpperCase();
  const toCurrency = (to as string).toUpperCase();

  if (fromCurrency === toCurrency) {
    res.json({ from: fromCurrency, to: toCurrency, amount: amountNum, convertedAmount: amountNum, rate: 1 });
    return;
  }

  try {
    let rates: Record<string, number>;
    const cached = exchangeRateCache.get(fromCurrency);

    if (cached && Date.now() < cached.expiry) {
      rates = cached.rates;
    } else {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
      const data = await response.json();
      rates = data.rates;
      exchangeRateCache.set(fromCurrency, { rates, expiry: Date.now() + 60 * 60 * 1000 }); // 1 hour
    }

    const rate = rates[toCurrency];
    if (!rate) {
      res.status(400).json({ error: `Unsupported currency: ${toCurrency}` });
      return;
    }

    const convertedAmount = parseFloat((amountNum * rate).toFixed(2));
    res.json({ from: fromCurrency, to: toCurrency, amount: amountNum, convertedAmount, rate });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch exchange rates" });
  }
});

export default router;
