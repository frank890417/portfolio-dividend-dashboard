const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const WANTGOO_BASE_URL = 'https://www.wantgoo.com';

app.get('/api/dividends', async (req, res) => {
    const { ticker } = req.query;

    if (!ticker) {
        return res.status(400).json({ error: 'Ticker is required' });
    }

    const symbol = ticker.toUpperCase();
    const paths = [
        `/stock/${symbol}/dividend-policy/ex-dividend-data`,
        `/stock/etf/${symbol}/dividend-policy/ex-dividend-data`,
        `/stock/${symbol.toLowerCase()}/dividend-policy/ex-dividend-data`,
        `/stock/etf/${symbol.toLowerCase()}/dividend-policy/ex-dividend-data`
    ];

    for (const path of paths) {
        try {
            const url = `${WANTGOO_BASE_URL}${path}`;
            console.log(`Trying URL: ${url}`);

            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Referer': `${WANTGOO_BASE_URL}/stock/${symbol}/dividend-policy/ex-dividend`
                },
                timeout: 5000
            });

            if (response.status === 200 && Array.isArray(response.data)) {
                console.log(`Success fetching ${symbol} from ${path}`);
                return res.json(response.data);
            }
        } catch (error) {
            console.error(`Error for ${symbol} at ${path}: ${error.response ? error.response.status : error.message}`);
        }
    }

    res.status(404).json({ error: `Failed to fetch dividend data for ${symbol}` });
});

app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
});
