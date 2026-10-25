import json
import urllib.request
import hashlib
import os

def main():
    print('1. Fetching SEC database...')
    url = 'https://www.sec.gov/files/company_tickers.json'
    req = urllib.request.Request(url, headers={'User-Agent': 'ApexTradeTerminal admin@apextrade.com'})
    sec_map = {}
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            sec_data = json.loads(resp.read().decode())
            sec_map = {item['ticker'].upper(): item['title'] for item in sec_data.values()}
            print(f'Retrieved {len(sec_map)} SEC tickers')
    except Exception as e:
        print('SEC fetch warning:', e)

    print('2. Reading public/assets/aistudio/tickets_22eaa9b8.txt...')
    with open('public/assets/aistudio/tickets_22eaa9b8.txt') as f:
        raw_tickers = [l.strip().upper() for l in f if l.strip()]

    seen = set()
    unique_tickers = []
    for t in raw_tickers:
        if t not in seen:
            seen.add(t)
            unique_tickers.append(t)

    print(f'Total unique tickers: {len(unique_tickers)}')

    curated_known = {
      'TORO': {
        'ticker': 'TORO',
        'name': 'Toro Corp',
        'price': 4.2800,
        'change': 0.6900,
        'changePercent': 18.85,
        'openPercent': 17.57,
        'volume': 335894,
        'avgVolume': 250000,
        'high': 4.5200,
        'low': 3.6500,
        'open': 3.6800,
        'prevClose': 3.5900,
        'afterHoursChange': -0.0700,
        'afterHoursPercent': -1.61,
        'm1Change': 0.00,
        'm5Change': 0.00,
        'm15Change': 0.00,
        'h1Change': 0.00,
        'h4Change': 0.70,
        'tagColor': '#ef4444',
        'isFavorite': True,
        'marketCap': '$84.2M',
        'peRatio': 5.4,
        'floatShares': '16.8M',
        'high52w': 6.8500,
        'low52w': 2.1500,
        'sector': 'Industrials & Shipping',
        'description': 'Toro Corp operates an international fleet of tanker vessels carrying crude oil and petroleum products, as well as dry bulk vessels.'
      },
      'AIOK': {
        'ticker': 'AIOK',
        'name': 'Aioke Health Corp',
        'price': 3.4200,
        'change': 2.2100,
        'changePercent': 182.82,
        'openPercent': 116.58,
        'volume': 42894587,
        'avgVolume': 1200000,
        'high': 3.8000,
        'low': 1.1500,
        'open': 1.5800,
        'prevClose': 1.2100,
        'afterHoursChange': 0.0800,
        'afterHoursPercent': 2.34,
        'm1Change': -0.05,
        'm5Change': 3.42,
        'm15Change': 5.14,
        'h1Change': 7.03,
        'h4Change': -18.26,
        'tagColor': '#ef4444',
        'isFavorite': False,
        'marketCap': '$45.1M',
        'peRatio': 0,
        'floatShares': '8.4M',
        'high52w': 5.1000,
        'low52w': 0.8500,
        'sector': 'Biotechnology',
        'description': 'Aioke Health develops computational drug therapies and oncology candidate solutions targeted at genetic immunotherapies.'
      },
      'CLRO': {
        'ticker': 'CLRO',
        'name': 'ClearOne Inc',
        'price': 1.6200,
        'change': 0.6600,
        'changePercent': 69.27,
        'openPercent': 64.97,
        'volume': 36618744,
        'avgVolume': 850000,
        'high': 1.8400,
        'low': 0.9500,
        'open': 0.9800,
        'prevClose': 0.9600,
        'afterHoursChange': -0.0200,
        'afterHoursPercent': -1.23,
        'm1Change': -0.67,
        'm5Change': -2.65,
        'm15Change': -3.92,
        'h1Change': 0.01,
        'h4Change': -9.84,
        'tagColor': '#3b82f6',
        'isFavorite': False,
        'marketCap': '$38.9M',
        'peRatio': 12.1,
        'floatShares': '19.2M',
        'high52w': 2.4500,
        'low52w': 0.6200,
        'sector': 'Media & Telecom',
        'description': 'ClearOne designs, develops and markets conferencing, collaboration, and network streaming solutions for enterprise communications.'
      },
      'LYCA': {
        'ticker': 'LYCA',
        'name': 'Lyca Mobile Tech',
        'price': 2.1500,
        'change': 0.8600,
        'changePercent': 66.67,
        'openPercent': 5.08,
        'volume': 2287448,
        'avgVolume': 410000,
        'high': 2.4000,
        'low': 1.2800,
        'open': 2.0500,
        'prevClose': 1.2900,
        'afterHoursChange': 0.0100,
        'afterHoursPercent': 0.46,
        'm1Change': 0.00,
        'm5Change': 0.00,
        'm15Change': 1.47,
        'h1Change': 1.43,
        'h4Change': -10.33,
        'tagColor': '#10b981',
        'isFavorite': False,
        'marketCap': '$52.7M',
        'peRatio': 8.6,
        'floatShares': '14.5M',
        'high52w': 3.9000,
        'low52w': 0.9200,
        'sector': 'Media & Telecom',
        'description': 'Lyca Mobile Tech provides wireless mobile virtual network operator services and global MVNO roaming architecture.'
      },
      'BOLT': {
        'ticker': 'BOLT',
        'name': 'Bolt Biotherapeutics',
        'price': 1.4800,
        'change': 0.4900,
        'changePercent': 49.49,
        'openPercent': 17.56,
        'volume': 7489210,
        'avgVolume': 950000,
        'high': 1.6800,
        'low': 0.9800,
        'open': 1.2500,
        'prevClose': 0.9900,
        'afterHoursChange': -0.0100,
        'afterHoursPercent': -0.67,
        'm1Change': 0.00,
        'm5Change': -1.33,
        'm15Change': -2.63,
        'h1Change': -1.99,
        'h4Change': 1.37,
        'tagColor': '#ef4444',
        'isFavorite': False,
        'marketCap': '$58.3M',
        'peRatio': 0,
        'floatShares': '32.1M',
        'high52w': 2.3000,
        'low52w': 0.5500,
        'sector': 'Biotechnology',
        'description': 'Bolt Biotherapeutics is a clinical-stage immuno-oncology company developing tumor-targeted therapies based on its Boltbody platform.'
      },
      'NVDA': {
        'ticker': 'NVDA',
        'name': 'NVIDIA Corp',
        'price': 141.5400,
        'change': 2.3500,
        'changePercent': 1.69,
        'openPercent': 0.85,
        'volume': 54203100,
        'avgVolume': 48000000,
        'high': 143.2000,
        'low': 139.1000,
        'open': 140.0000,
        'prevClose': 139.1900,
        'afterHoursChange': 0.4500,
        'afterHoursPercent': 0.32,
        'm1Change': 0.05,
        'm5Change': 0.18,
        'm15Change': 0.42,
        'h1Change': 0.95,
        'h4Change': 1.45,
        'tagColor': '#10b981',
        'isFavorite': True,
        'marketCap': '$3.47T',
        'peRatio': 62.4,
        'floatShares': '24.1B',
        'high52w': 144.4200,
        'low52w': 39.2300,
        'sector': 'Semiconductors',
        'description': 'NVIDIA pioneered accelerated computing to tackle challenges no one else can solve. Its GPUs and CUDA platform power global generative AI workloads.'
      },
      'TSLA': {
        'ticker': 'TSLA',
        'name': 'Tesla Inc',
        'price': 269.1900,
        'change': 5.2400,
        'changePercent': 1.99,
        'openPercent': 1.20,
        'volume': 68420100,
        'avgVolume': 75000000,
        'high': 272.5000,
        'low': 262.3000,
        'open': 265.0000,
        'prevClose': 263.9500,
        'afterHoursChange': -0.8500,
        'afterHoursPercent': -0.32,
        'm1Change': -0.02,
        'm5Change': 0.10,
        'm15Change': 0.35,
        'h1Change': 1.10,
        'h4Change': 2.45,
        'tagColor': '#ef4444',
        'isFavorite': True,
        'marketCap': '$858B',
        'peRatio': 74.2,
        'floatShares': '2.6B',
        'high52w': 273.5400,
        'low52w': 138.8000,
        'sector': 'Consumer & Retail',
        'description': 'Tesla designs, manufactures, and sells electric vehicles, energy storage systems, solar products, and autonomous Full Self-Driving AI tech.'
      },
      'AAPL': {
        'ticker': 'AAPL',
        'name': 'Apple Inc',
        'price': 231.5000,
        'change': 1.8500,
        'changePercent': 0.81,
        'openPercent': 0.42,
        'volume': 38401200,
        'avgVolume': 45000000,
        'high': 232.8000,
        'low': 229.4000,
        'open': 230.5000,
        'prevClose': 229.6500,
        'afterHoursChange': 0.1200,
        'afterHoursPercent': 0.05,
        'm1Change': 0.02,
        'm5Change': 0.05,
        'm15Change': 0.14,
        'h1Change': 0.35,
        'h4Change': 0.65,
        'tagColor': '#3b82f6',
        'isFavorite': False,
        'marketCap': '$3.48T',
        'peRatio': 33.8,
        'floatShares': '15.1B',
        'high52w': 237.2300,
        'low52w': 164.0800,
        'sector': 'Consumer & Retail',
        'description': 'Apple designs smartphones, personal computers, tablets, wearables, and ecosystem digital cloud software services.'
      },
      'QQQ': {
        'ticker': 'QQQ',
        'name': 'Invesco QQQ Trust (NASDAQ 100)',
        'price': 494.3500,
        'change': 5.6200,
        'changePercent': 1.15,
        'openPercent': 0.80,
        'volume': 41203900,
        'avgVolume': 38000000,
        'high': 496.1000,
        'low': 490.2000,
        'open': 490.5000,
        'prevClose': 488.7300,
        'afterHoursChange': 0.4500,
        'afterHoursPercent': 0.09,
        'm1Change': 0.04,
        'm5Change': 0.12,
        'm15Change': 0.28,
        'h1Change': 0.64,
        'h4Change': 1.05,
        'tagColor': '#10b981',
        'isFavorite': True,
        'marketCap': '$290B',
        'peRatio': 28.5,
        'floatShares': '580M',
        'high52w': 503.5200,
        'low52w': 350.2000,
        'sector': 'Index ETF',
        'description': 'Tracks the NASDAQ-100 Index, comprising the 100 largest non-financial companies listed on the NASDAQ exchange.'
      }
    }

    colors = ['#ef4444', '#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899']

    def clean_title(raw: str, ticker: str) -> str:
        if not raw:
            if ticker.endswith('U'):
                return f'{ticker[:-1]} Acquisition Corp. Units'
            elif ticker.endswith('W'):
                return f'{ticker[:-1]} Acquisition Corp. Warrants'
            return f'{ticker} Corp.'
        
        words = raw.split()
        cleaned = []
        for w in words:
            wu = w.upper()
            if wu in ['INC', 'INC.', 'CORP', 'CORP.', 'LTD', 'LTD.', 'LLC', 'PLC', 'CO', 'CO.', 'N.V.', 'S.A.', 'AG', 'LP']:
                cleaned.append(w.capitalize())
            elif wu in ['USA', 'AI', 'EV', 'DNA', 'RNA', 'IT', 'IP', 'GL', 'TC', 'SPAC', 'ETF']:
                cleaned.append(wu)
            else:
                cleaned.append(w.capitalize())
        return ' '.join(cleaned)

    def classify_sector(name: str) -> str:
        n = name.lower()
        if any(k in n for k in ['therap', 'bio', 'pharma', 'health', 'medic', 'genom', 'oncolog', 'clinic']):
            return 'Biotechnology'
        if any(k in n for k in ['semi', 'silicon', 'micro', 'chip', 'wafer', 'devices']):
            return 'Semiconductors'
        if any(k in n for k in ['soft', 'cloud', 'cyber', 'data', 'ai', 'technolog', 'network', 'digital', 'systems']):
            return 'Software & Technology'
        if any(k in n for k in ['solar', 'energy', 'power', 'renew', 'gas', 'oil', 'petrol']):
            return 'Clean Energy & Power'
        if any(k in n for k in ['bank', 'banc', 'finan', 'capit', 'trust', 'acquisit', 'invest', 'insur', 'spac']):
            return 'Financial Services'
        if any(k in n for k in ['retail', 'brand', 'consum', 'beverag', 'food', 'auto', 'apparel']):
            return 'Consumer & Retail'
        if any(k in n for k in ['aero', 'defen', 'logist', 'transport', 'ship', 'marin', 'fleet']):
            return 'Industrials & Shipping'
        if any(k in n for k in ['media', 'entert', 'communic', 'telecom', 'broad']):
            return 'Media & Telecom'
        return 'Diversified NASDAQ'

    all_stocks = []

    # Ensure TORO is first so terminal starts with TORO as in reference
    ordered_tickers = []
    if 'TORO' in unique_tickers:
        ordered_tickers.append('TORO')
    for t in unique_tickers:
        if t != 'TORO':
            ordered_tickers.append(t)

    for i, ticker in enumerate(ordered_tickers):
        if ticker in curated_known:
            all_stocks.append(curated_known[ticker])
            continue
        
        h = int(hashlib.md5(ticker.encode()).hexdigest(), 16)
        
        sec_name = sec_map.get(ticker, '')
        name = clean_title(sec_name, ticker)
        sector = classify_sector(name)
        
        tier = h % 100
        if tier < 45:
            base_price = 0.2500 + (h % 45000) / 10000.0
        elif tier < 85:
            base_price = 5.0000 + (h % 400000) / 10000.0
        else:
            base_price = 45.0000 + (h % 2200000) / 10000.0
        
        price = round(base_price, 4)
        
        change_seed = ((h >> 4) % 1000) / 10.0
        if change_seed < 12:
            change_pct = round(20.0 + ((h >> 8) % 12000) / 100.0, 2)
        elif change_seed < 55:
            change_pct = round(((h >> 8) % 1800) / 100.0, 2)
        else:
            change_pct = round(-(((h >> 8) % 1400) / 100.0), 2)
        
        change = round(price * (change_pct / 100.0), 4)
        prev_close = round(max(0.0001, price - change), 4)
        open_p = round(prev_close * (1 + ((h >> 12) % 600 - 250) / 10000.0), 4)
        open_pct = round(((price - open_p) / open_p) * 100.0, 2)
        
        spread = abs(change) * 0.8 + price * 0.03
        high = round(max(price, open_p) + ((h >> 16) % 1000) / 1000.0 * spread, 4)
        low = round(max(0.0001, min(price, open_p) - ((h >> 20) % 1000) / 1000.0 * spread), 4)
        
        vol_tier = (h >> 24) % 100
        if vol_tier < 15:
            volume = 8000000 + ((h >> 28) % 35000000)
        elif vol_tier < 65:
            volume = 650000 + ((h >> 28) % 4500000)
        else:
            volume = 85000 + ((h >> 28) % 800000)
        
        avg_vol = int(volume * (0.6 + ((h >> 32) % 80) / 100.0))
        
        shares = (h >> 36) % 250 + 5
        mcap_val = price * shares * 1000000
        if mcap_val >= 1000000000:
            market_cap = f'${mcap_val / 1000000000:.1f}B'
        else:
            market_cap = f'${mcap_val / 1000000:.1f}M'
            
        pe_ratio = round(((h >> 40) % 450) / 10.0, 1) if (h >> 44) % 3 != 0 else 0
        float_shares = f'{shares:.1f}M'
        high_52 = round(price * (1.2 + ((h >> 48) % 120) / 100.0), 4)
        low_52 = round(max(0.0001, price * (0.3 + ((h >> 52) % 40) / 100.0)), 4)
        
        m1 = round(((h >> 56) % 30 - 15) / 100.0, 2)
        m5 = round(((h >> 60) % 80 - 40) / 100.0, 2)
        m15 = round(((h >> 64) % 160 - 80) / 100.0, 2)
        h1 = round(((h >> 68) % 350 - 175) / 100.0, 2)
        h4 = round(((h >> 72) % 700 - 350) / 100.0, 2)
        
        color = colors[h % len(colors)]
        
        desc = f'{name} ({ticker}) is listed on the NASDAQ exchange operating in the {sector} sector.'
        
        all_stocks.append({
            'ticker': ticker,
            'name': name,
            'price': price,
            'change': change,
            'changePercent': change_pct,
            'openPercent': open_pct,
            'volume': volume,
            'avgVolume': avg_vol,
            'high': high,
            'low': low,
            'open': open_p,
            'prevClose': prev_close,
            'afterHoursChange': round(change * 0.05, 4),
            'afterHoursPercent': round(change_pct * 0.05, 2),
            'm1Change': m1,
            'm5Change': m5,
            'm15Change': m15,
            'h1Change': h1,
            'h4Change': h4,
            'tagColor': color,
            'isFavorite': False,
            'marketCap': market_cap,
            'peRatio': pe_ratio,
            'floatShares': float_shares,
            'high52w': high_52,
            'low52w': low_52,
            'sector': sector,
            'description': desc
        })

    os.makedirs('src/data', exist_ok=True)
    with open('src/data/nasdaqStocks.json', 'w') as f:
        json.dump(all_stocks, f, indent=2)

    print(f'Successfully wrote {len(all_stocks)} stocks to src/data/nasdaqStocks.json!')
    print(f'File size: {os.path.getsize("src/data/nasdaqStocks.json") / 1024:.1f} KB')

if __name__ == '__main__':
    main()
