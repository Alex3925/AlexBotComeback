const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// State management: Save active threads to a JSON file so they stay "ON" even after a restart
const threadsFile = path.join(__dirname, "cache", "sim_threads.json");

function loadActiveThreads() {
    try {
        if (!fs.existsSync(threadsFile)) return new Set();
        const data = fs.readJsonSync(threadsFile);
        return new Set(data);
    } catch (e) {
        return new Set();
    }
}

function saveActiveThreads(set) {
    fs.outputJsonSync(threadsFile, Array.from(set));
}

let activeSimThreads = loadActiveThreads();

module.exports.config = {
    name: "simv3",
    version: "3.1.0",
    permission: 0,
    credits: "Alex",
    prefix: false,
    description: "SimSimi auto-reply with persistent state",
    category: "AI",
    usages: "sim [on/off]",
    cooldowns: 2
};

module.exports.handleEvent = async function({ api, event }) {
    const { threadID, body, senderID, messageID } = event;
    
    // Only trigger if SimSimi is ON for this thread and message isn't from the bot itself
    if (!activeSimThreads.has(threadID)) return;
    if (!body || senderID === api.getCurrentUserID()) return;

    try {
        const { data } = await axios.get(`https://simsimi.ooguy.com/sim`, {
            params: {
                query: body,
                apikey: "2899d5d398374068b18eae52b52463d8e9204d8a"
            }
        });

        if (data && data.respond) {
            api.sendMessage(data.respond, threadID, messageID);
        }
    } catch (error) {
        console.error("SimSimi Error:", error.message);
    }
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const mode = (args[0] || "").toLowerCase();

    if (mode === "on") {
        if (activeSimThreads.has(threadID)) {
            return api.sendMessage("⚠️ SimSimi is already active in this thread.", threadID);
        }
        activeSimThreads.add(threadID);
        saveActiveThreads(activeSimThreads);
        return api.sendMessage("✅ SimSimi auto-reply is now ON.", threadID, messageID);
    }

    if (mode === "off") {
        if (!activeSimThreads.has(threadID)) {
            return api.sendMessage("⚠️ SimSimi is not active here.", threadID);
        }
        activeSimThreads.delete(threadID);
        saveActiveThreads(activeSimThreads);
        return api.sendMessage("❌ SimSimi auto-reply is now OFF.", threadID, messageID);
    }

    return api.sendMessage("📌 Usage:\nsim on — Enable auto-reply\nsim off — Disable auto-reply", threadID, messageID);
};
